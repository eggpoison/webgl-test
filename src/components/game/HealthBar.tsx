import { useEffect, useRef, useState } from "react";
import HealthIcon from "../../images/miscellaneous/health.png";

export let updateHealthBar: (newHealth: number) => void;

const HealthBar = () => {
   const healthBarRef = useRef<HTMLDivElement | null>(null);
   const [health, setHealth] = useState(20);
   
   useEffect(() => {
      updateHealthBar = (newHealth: number) => {
         if (healthBarRef.current !== null) {
            // Stop health from being negative
            const clampedNewHealth = Math.max(newHealth, 0);
            
            const previousHealth = health;
            setHealth(clampedNewHealth);
      
            const healthBar = healthBarRef.current!;
            healthBar.style.setProperty("--current-health", clampedNewHealth.toString());
            healthBar.style.setProperty("--previous-health", previousHealth.toString());
      
            healthBar.classList.remove("animated");
            // Trigger reflow
            void(healthBar.offsetHeight);
            healthBar.classList.add("animated");
         }
      }
   }, [health]);

   return <div id="health-bar" ref={healthBarRef}>
      <div className="health-icon">
         <img src={HealthIcon} alt="" />
         <div className="health-counter">{health}</div>
      </div>
      <div className="health-slider"></div>
      <div className="health-flash"></div>
      <div className="health-bar-notches"></div>
      <div className="health-mask"></div>
   </div>;
}

export default HealthBar;