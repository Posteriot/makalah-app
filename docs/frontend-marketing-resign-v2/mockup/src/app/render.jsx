/* Static mockup render entry */

const App = () => <MarketingLayoutMock />;

Object.assign(window, { App });

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
