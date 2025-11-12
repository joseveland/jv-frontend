#!/usr/bin/env python3
import hashlib
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional, Tuple, Iterable

import boto3
import os
import mimetypes
import argparse
from pathlib import Path


class S3CloudFrontDeployer:

    def __init__(self, local_folder_path: str, bucket_name: str, distribution_id: str, debug: bool = False):
        self.s3 = boto3.client('s3')
        self.cloudfront = boto3.client('cloudfront')
        self.bucket_name = bucket_name
        self.distribution_id = distribution_id
        self.local_folder_path = local_folder_path
        self.debug = debug

        # Custom MIME type mappings
        self.custom_mime_types = {
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.map': 'application/json',
            '.webp': 'image/webp',
            '.avif': 'image/avif',
        }

        # Track files for invalidation
        self.uploaded_files = set()

    @staticmethod
    def get_file_md5(file_path):
        """Calculate MD5 hash of file for change detection"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    @staticmethod
    def get_cache_control(file_path):
        """Determine cache control headers based on file type"""
        file_extension = Path(file_path).suffix.lower()

        # CSS, JS, images, fonts - long cache (1 year)
        if file_extension in ['.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
                                '.avif', '.woff', '.woff2', '.ttf', '.eot']:
            return 'max-age=31536000, immutable'

        # Angular `index.html` do not change for a new build, while other `-Xxx.js` and `-Xxx.css` resources do,
        # however internally a new version changes the internal references inside `index.html` to those resources.
        # 1. One approach is letting S3 has the header to influence CloudFront behavior, so it always fetches
        # `index.html` as having no cache.
        # 2. HOWEVER, cache is good, so really what I need to do is a proper "Invalidation action" against my
        # CloudFront resources when I do a new deployment/built-version, instead of avoiding cache completely
        # for `index.html`. So I comment this out for now and let CloudFront uses its default cache TTL (1 day).
        # if file_extension in ['.html', '.htm']:
        #     return 'no-cache, no-store, must-revalidate'

        # Everything else - moderate cache (1 hour)
        return 'max-age=3600'

    def get_content_type(self, file_path):
        """Determine content type based on file extension"""
        file_extension = Path(file_path).suffix.lower()

        if file_extension in self.custom_mime_types:
            return self.custom_mime_types[file_extension]

        content_type, _ = mimetypes.guess_type(file_path)
        return content_type or 'application/octet-stream'

    def get_s3_etags(self):
        """Get ETags of all S3 objects"""
        paginator = self.s3.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=self.bucket_name)

        s3_objects = {}
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    # The ETag is actually a MD5 standard hashing in hex format, but comes with quotes so removing them
                    s3_objects[obj['Key']] = obj['ETag'].strip('"')

        return s3_objects

    def get_local_files(self):
        local_files = {}

        # Build local files index with hashes
        for root, dirs, files in os.walk(self.local_folder_path):
            for file in files:
                local_file_path = os.path.join(root, file)
                relative_path = os.path.relpath(local_file_path, self.local_folder_path)
                s3_key = relative_path.replace(os.sep, '/')

                file_hash = self.get_file_md5(local_file_path)
                local_files[s3_key] = {
                    'local_path': local_file_path,
                    'hash': file_hash
                }

        return local_files

    def upload_file(self, local_file_path, s3_key):
        """Upload a single file with proper content type and cache headers"""
        content_type = self.get_content_type(local_file_path)
        cache_control = self.get_cache_control(local_file_path)

        extra_args = {
            'ContentType': content_type,
            'CacheControl': cache_control
        }

        try:
            if not self.debug:  # Emulate valid upload just to visualize changes
                self.s3.upload_file(
                    local_file_path,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs=extra_args
                )
            # Tracking uploaded files for invalidation
            self.uploaded_files.add(s3_key)
            return True, f"✅ Uploaded: {s3_key} ({content_type}) [Cache: {cache_control}]"

        except Exception as e:
            return False, f"❌ Error uploading {s3_key}: {e}"

    def _handle_uploads(self, files_to_upload: List[Tuple[str, str]], parallel: int):
        print(f"📤 Uploading {len(files_to_upload)} files...")
        with ThreadPoolExecutor(max_workers=parallel) as executor:
            future_to_file = [
                executor.submit(self.upload_file, local_path, s3_key)
                for local_path, s3_key in files_to_upload
            ]

            for future in as_completed(future_to_file):
                _success, message = future.result()
                print(f'\t{message}')   # The `message` already contains success/failure icon

    def _delete_extra_files(self, local_keys, s3_keys):
        """Delete files in S3 that don't exist locally"""
        s3_keys_set = set(s3_keys)
        local_keys_set = set(local_keys)

        files_to_delete = s3_keys_set - local_keys_set

        if files_to_delete:
            print(f"🗑️ Deleting {len(files_to_delete)} files from S3...")

            # Delete in batches of 1000
            files_list = list(files_to_delete)
            for i in range(0, len(files_list), 1000):
                batch = [{'Key': key} for key in files_list[i:i + 1000]]

                if not self.debug:  # Emulate valid upload just to visualize changes
                    self.s3.delete_objects(
                        Bucket=self.bucket_name,
                        Delete={'Objects': batch}
                    )

                for obj in batch:
                    print(f"\t✅ Deleted: {self.bold(obj['Key'])}")
        else:
            print("✅ No files to delete.")

    def create_cloud_front_invalidation(self, paths=None):
        """Create CloudFront invalidation for specific paths"""
        if paths is None:
            paths = []

        # If any invalidation will be executed, always invalidate the root path at least
        paths.append("/")

        # Add any other changed HTML files
        for html_file in self.uploaded_files:
            # Convert S3 key to CloudFront path
            path = f"/{html_file}"
            if path not in paths:
                paths.append(path)

        # Ensure paths are properly formatted
        formatted_paths = []
        for path in paths:
            if not path.startswith('/'):
                path = f'/{path}'
            formatted_paths.append(path)

        # Remove duplicates
        formatted_paths = list(set(formatted_paths))

        print(f"🔄 Creating invalidation(s) for {len(formatted_paths)} paths:")
        for path in formatted_paths:
            print(f"\t{path}")

        try:
            if self.debug:  # Emulate valid upload just to visualize changes
                response = {
                    'Invalidation': {'Id': 'DUMMYDEBUGINVALIDATIONID'}
                }

            else:
                response = self.cloudfront.create_invalidation(
                    DistributionId=self.distribution_id,
                    InvalidationBatch={
                        'Paths': {
                            'Quantity': len(formatted_paths),
                            'Items': formatted_paths
                        },
                        'CallerReference': f"deploy-{int(time.time())}"
                    }
                )

            invalidation_id = response['Invalidation']['Id']
            print(f"\t✅ Invalidation created for Distribution `{self.distribution_id}`: {invalidation_id}")

            # Optional: Wait for invalidation to complete
            self._wait_for_invalidation_completion(invalidation_id)

            return invalidation_id

        except Exception as e:
            print(f"\t❌ Error creating invalidation for Distribution `{self.distribution_id}`: {e}")
            return None

    def _wait_for_invalidation_completion(self, invalidation_id, timeout=300):
        """Wait for CloudFront invalidation to complete"""
        print("\t\t⏳ Waiting for invalidation to complete...")
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                if self.debug:  # Emulate valid upload just to visualize changes
                    response = {
                        'Invalidation': {'Status': 'Completed'}
                    }

                else:
                    response = self.cloudfront.get_invalidation(
                        DistributionId=self.distribution_id,
                        Id=invalidation_id
                    )

                status = response['Invalidation']['Status']

                if status == 'Completed':
                    print("\t\t✅ CloudFront invalidation completed!")
                    return True
                elif status == 'InProgress':
                    print(".", end="", flush=True)
                    time.sleep(10)  # Check every 10 seconds
                else:
                    print(f"\t\t❓ Unexpected invalidation status: {status}")
                    return False

            except Exception as e:
                print(f"\t\t❌ Error checking invalidation status: {e}")
                return False

        print("\t\t⏰ Timeout waiting for invalidation completion")
        return False

    def _handle_invalidations(
        self, local_keys: Iterable[str], s3_keys: Iterable[str], forced_invalidations: Optional[List[str]] = None,
    ):
        # Create CloudFront invalidation if needed (Or forced)
        if forced_invalidations:
            print("📝 Forced invalidations...")
            for forced_key in forced_invalidations:
                bold_text = self.bold(forced_key)
                if (forced_key in local_keys) or (forced_key in s3_keys):
                    print(f"\t♻ {bold_text} will be invalidated.")
                    self.uploaded_files.add(forced_key)
                else:   # That file doesn't exist within the local files to be uploaded nor in S3 already
                    print(f"\t⚠️ {bold_text} will be ignored as NOT-found.")

        if self.uploaded_files:
            self.create_cloud_front_invalidation()
        else:
            print("✅ No CloudFront invalidation needed.")

    def sync(self, delete=False, parallel=10, s3_keys_for_invalidation: Optional[List[str]] = None):
        """Perform smart sync with change detection"""
        print("🔍 Scanning local files...")
        local_files = self.get_local_files()
        print(f"\t{tuple(local_files.keys())}")

        print("🔍 Scanning S3 objects...")
        s3_objects_with_hashes = self.get_s3_etags()
        print(f"\t{tuple(s3_objects_with_hashes.keys())}")

        # Determine files to upload (new or changed)
        files_to_upload = []
        if local_files:
            print("🧠 Hash analysis")
        for s3_key, local_info in local_files.items():
            local_hash = local_info['hash']
            remote_hash = s3_objects_with_hashes.get(s3_key)
            do_change = local_hash != remote_hash

            printable_s3_key = self.bold(s3_key) if do_change else s3_key
            printable_s3_key_status = '❗' if do_change else '✔'
            print(f"\t({printable_s3_key} {printable_s3_key_status} ) {local_hash} vs {remote_hash}")

            if s3_key not in s3_objects_with_hashes or do_change:
                files_to_upload.append((local_info['local_path'], s3_key))

        # Upload files in parallel (While filling up `self.uploaded_files` inside `upload_file()` method)
        if files_to_upload:
            self._handle_uploads(files_to_upload, parallel)
        else:
            print("✅ No files need uploading.")

        # Handle deletion
        if delete:
            self._delete_extra_files(local_files.keys(), s3_objects_with_hashes.keys())

        # Handle CloudFront invalidations
        self._handle_invalidations(
            local_keys=local_files.keys(),
            s3_keys=s3_objects_with_hashes.keys(),
            forced_invalidations=s3_keys_for_invalidation,
        )

    @staticmethod
    def bold(value: str):
        """Return bold formatted string for terminal output"""
        return f"\033[1m{value}\033[0m"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('source', help='Local directory to sync')
    parser.add_argument('bucket', help='S3 bucket name')
    parser.add_argument('distribution', help='CloudFront distribution ID for invalidation actions')
    parser.add_argument('--force', nargs='*', help='S3 files to force cache-invalidation against CloudFront')
    args = parser.parse_args()

    deployer = S3CloudFrontDeployer(args.source, args.bucket, args.distribution)
    deployer.sync(delete=True, parallel=10, s3_keys_for_invalidation=args.force)
