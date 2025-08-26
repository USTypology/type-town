import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from './AppStatic.tsx';
import './index.css';
import 'uplot/dist/uPlot.min.css';
import 'react-toastify/dist/ReactToastify.css';
import StaticDataProvider from './components/StaticDataProvider.tsx';

// Global error instrumentation to capture unhandled promise rejections and errors
if (typeof window !== 'undefined') {
  window.onunhandledrejection = (event) => {
    try {
      // Some errors surface as generic Event; try to expand details
      const reason = (event as any).reason || event;
      console.error('[UnhandledRejection]', {
        reason,
        message: reason?.message,
        stack: reason?.stack,
      });
    } catch (e) {
      console.error('[UnhandledRejection] (failed to introspect)', event);
    }
  };
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[WindowError]', { message, source, lineno, colno, stack: (error as any)?.stack });
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StaticDataProvider>
      <Home />
    </StaticDataProvider>
  </React.StrictMode>,
);
