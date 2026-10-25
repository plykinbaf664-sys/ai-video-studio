import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
let promise: Promise<unknown> | undefined;
export const usePersonalFonts = () => {
  const [handle] = useState(() =>
    delayRender("Load licensed Onest and Inter before layout"),
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    promise ??= Promise.all([
      loadFont({
        family: "PersonalOnest",
        url: staticFile("generated/assets/fonts/personal-onest.ttf"),
        weight: "100 900",
      }),
      loadFont({
        family: "PersonalInter",
        url: staticFile("generated/assets/fonts/personal-inter.ttf"),
        weight: "100 900",
      }),
    ]);
    promise
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [handle]);
  return ready;
};
