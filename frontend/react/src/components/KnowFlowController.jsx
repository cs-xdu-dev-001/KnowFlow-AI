import { useEffect } from "react";
import { startKnowFlowController } from "../controller/knowflowController.js";

export function KnowFlowController() {
  useEffect(() => {
    startKnowFlowController();
  }, []);

  return null;
}
