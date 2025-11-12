# Intro

Angular is a powerful framework for building web applications.
Here are some key concepts:

## Key Features

- Component-based architecture
- TypeScript support
- Dependency injection
- RxJS for reactive programming

## Getting Started

1. Install Node.js v20 or above

2. Install Angular CLI globally for Node, using its Package Manager (npm)

  ```shell
  npm install -g @angular/cli
  ```

3. Create a new angular project through the angular CLI (ng) globally
installed above

  ```shell
  ng new your-frontend-slug --routing --style=scss
  cd your-frontend-slug/
  ```

4. Install dependencies, run the angular project in your local, or build
the logic as the typical `HTML, CSS and JS` combo to be served by any web
server out there

  ```shell
  npm install
  npm start
  npm run build
  ```

5. Start building components (.ts, .scss, .html), services (.ts),
pipes (.ts), among others!

  ```shell
  ng g c components/home      # <app-home> selector
  ng g c components/about     # <app-about> selector
  ng g s services/data
  ng g p pipes/filter
  ```

Happy coding with Angular!
