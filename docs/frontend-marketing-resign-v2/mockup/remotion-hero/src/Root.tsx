import "./index.css";
import { Composition } from "remotion";
import { HeroLoop } from "./HeroLoop";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HeroLoop"
        component={HeroLoop}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
