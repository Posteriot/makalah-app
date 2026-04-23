/* Static mockup render entry */

const App = () => (
  <MarketingLayoutMock>
    <MockRouter />
  </MarketingLayoutMock>
);

Object.assign(window, { App });

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
