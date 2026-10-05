import { Composition, Still } from "remotion";
import { LiltIntro, LiltPoster } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LiltIntro"
        component={LiltIntro}
        durationInFrames={720}
        fps={30}
        width={1920}
        height={1080}
      />
      <Still
        id="LiltPoster"
        component={LiltPoster}
        width={1920}
        height={1080}
      />
    </>
  );
};
