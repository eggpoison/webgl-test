import { useEffect, useState } from "react";

export let showChargeMeter: () => void;
export let hideChargeMeter: () => void = () => {};
export let updateChargeMeterProgress: (chargeProgress: number) => void;

const CHARGE_METER_TEXTURES: ReadonlyArray<string> = [
   "miscellaneous/charge-meter-0.png",
   "miscellaneous/charge-meter-1.png",
   "miscellaneous/charge-meter-2.png",
   "miscellaneous/charge-meter-3.png",
   "miscellaneous/charge-meter-4.png",
   "miscellaneous/charge-meter-5.png"
]

const ChargeMeter = () => {
   const [isVisible, setIsVisible] = useState(false);
   const [charge, setCharge] = useState(0);
   const [xPos, setXPos] = useState(0);
   const [yPos, setYPos] = useState(0);
   
   useEffect(() => {
      showChargeMeter = () => {
         setIsVisible(true);
      }

      hideChargeMeter = () => {
         setIsVisible(false);
      }
      
      updateChargeMeterProgress = (chargeProgress: number) => {
         const charge = Math.floor(chargeProgress * 5);
         setCharge(charge);
      }

      document.addEventListener("mousemove", (e: MouseEvent) => {
         setXPos(e.clientX);
         setYPos(e.clientY + 40);
      });
   }, []);

   if (!isVisible) {
      return null;
   }

   const textureSource = CHARGE_METER_TEXTURES[charge];
   return <div id="charge-meter-container" style={{left: xPos + "px", top: yPos + "px"}}>
      <img src={require("../../images/" + textureSource)} className="charge-meter" alt="" />
   </div>
}

export default ChargeMeter;