const ReactDOM = window.ReactDOM;

if (!ReactDOM) {
  throw new Error("ReactDOM runtime was not loaded before the application module.");
}

export const createPortal = ReactDOM.createPortal;
export const createRoot = ReactDOM.createRoot;
export const findDOMNode = ReactDOM.findDOMNode;
export const flushSync = ReactDOM.flushSync;
export const hydrateRoot = ReactDOM.hydrateRoot;
export const render = ReactDOM.render;
export const unmountComponentAtNode = ReactDOM.unmountComponentAtNode;
export const unstable_batchedUpdates = ReactDOM.unstable_batchedUpdates;
export const version = ReactDOM.version;

export default ReactDOM;
