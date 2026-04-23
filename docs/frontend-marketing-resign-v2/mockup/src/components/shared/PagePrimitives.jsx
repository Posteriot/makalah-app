/* Shared page primitives for reusable static mockup layouts */

const joinClassNames = (...values) => values.filter(Boolean).join(" ");

const PageSplitHero = ({
  eyebrow,
  title,
  description,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
  leftClassName = "",
  rightClassName = ""
}) => (
  <div className={joinClassNames("sec-head", "page-split-hero", className)}>
    <div className={joinClassNames("page-split-main", leftClassName)}>
      {eyebrow ? (
        <div className="sec-eyebrow">
          <span className="l">{eyebrow}</span>
        </div>
      ) : null}
      <h1 className={joinClassNames("sec-title", "page-split-title", titleClassName)}>
        {title}
      </h1>
    </div>
    <div className={joinClassNames("page-split-side", rightClassName)}>
      <p className={joinClassNames("sec-desc", "page-split-desc", descriptionClassName)}>
        {description}
      </p>
    </div>
  </div>
);

Object.assign(window, {
  joinClassNames,
  PageSplitHero
});
