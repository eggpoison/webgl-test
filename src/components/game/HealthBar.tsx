import { useEffect, useRef, useState } from "react";
import HealthIcon from "../../images/miscellaneous/health.png";

export let updateHealthBar: (newHealth: number) => void;

const HealthBar = () => {
   const healthBarRef = useRef<HTMLDivElement | null>(null);
   const [health, setHealth] = useState(20);
   
   useEffect(() => {
      updateHealthBar = (newHealth: number) => {
         if (healthBarRef.current !== null) {
            const previousHealth = health;
            setHealth(newHealth);
      
            const healthBar = healthBarRef.current!;
            healthBar.style.setProperty("--current-health", newHealth.toString());
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
      {/* minecraft refreerncre??/? */}
      <div className="notches">
         <div className="notch notch-minor"></div>
         <div className="notch notch-major"></div>
         <div className="notch notch-minor"></div>
         <div className="notch notch-major"></div>
         <div className="notch notch-minor"></div>
         <div className="notch notch-major"></div>
         <div className="notch notch-minor"></div>
      </div>
   </div>;
}

export default HealthBar;