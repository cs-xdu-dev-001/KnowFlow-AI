const ReactDOM = window.ReactDOM;

if (!ReactDOM) {
  throw new Error("ReactDOM runtime was not loaded before the application module.");
}

export const createRoot = ReactDOM.createRoot;
export const hydrateRoot = ReactDOM.hydrateRoot;

export default ReactDOM;
