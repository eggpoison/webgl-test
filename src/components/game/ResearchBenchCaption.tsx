import { useEffect, useState } from "react";

export let setResearchBenchCaption: (caption: string) => void;

const ResearchBenchCaption = () => {
   const [caption, setCaption] = useState("");

   useEffect(() => {
      setResearchBenchCaption = (caption: string): void => {
         setCaption(caption);
      }
   }, []);

   if (caption === "") {
      return null;
   }
   
   return <div id="research-bench-caption">{caption}</div>;
}

export default ResearchBenchCaption;