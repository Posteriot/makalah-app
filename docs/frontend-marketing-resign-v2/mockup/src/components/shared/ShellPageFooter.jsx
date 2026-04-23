/* Shared footer for shell-style pages */

const ShellPageFooter = ({ className = "" }) => (
  <footer className={`shell-page-footer${className ? ` ${className}` : ""}`}>
    <div>
      <p>&copy; 2026 Makalah AI</p>
      <p>Produk PT The Management Asia</p>
    </div>
    <div>
      <p>Made in Jakarta</p>
      <p>v0.8</p>
    </div>
  </footer>
);

Object.assign(window, { ShellPageFooter });
