import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { addKeyListener } from "../../keyboard-input";
import { TECHS, TechID, TechInfo, getTechByID } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../client-item-info";
import Game from "../../Game";
import Client from "../../client/Client";
import { setTechTreeX, setTechTreeY, setTechTreeZoom, techIsDirectlyAccessible } from "../../rendering/tech-tree-rendering";

interface TechProps {
   readonly techInfo: TechInfo;
   readonly positionX: number;
   readonly positionY: number;
   readonly zoom: number;
   readonly onMouseEnter: () => void;
   readonly onMouseLeave: () => void;
}
const Tech = ({ techInfo, positionX, positionY, zoom, onMouseEnter, onMouseLeave }: TechProps) => {
   const elementRef = useRef<HTMLDivElement | null>(null);
   const [showDetails, setShowDetails] = useState(false);

   useEffect(() => {
      if (elementRef.current !== null) {
         const element = elementRef.current;
         element.style.left = `calc(50% + (${techInfo.positionX}rem + ${positionX}px) * ${zoom})`;
         element.style.top = `calc(50% + (${-techInfo.positionY}rem + ${positionY}px) * ${zoom})`;
      }
   }, [techInfo.positionX, techInfo.positionY, positionX, positionY, zoom]);

   const isUnlocked = Game.tribe !== null && Game.tribe.hasUnlockedTech(techInfo.id);
   
   const research = (): void => {
      if (isUnlocked) {
         return;
      }
      
      Client.sendUnlockTech(techInfo.id);
   }
   
   return <div ref={elementRef} className={`tech${isUnlocked ? " unlocked" : ""}`} onMouseEnter={() => { onMouseEnter(); setShowDetails(true) }} onMouseLeave={() => { onMouseLeave(); setShowDetails(false) }}>
      <img src={require("../../images/tech-tree/" + techInfo.iconSrc)} alt="" className="icon" />
      <div className="icon-bg"></div>

      <div className="content">
         <p className="name">{techInfo.name}</p>

         {showDetails ? <>
            <div className="details">
               <ul>
                  {techInfo.researchItemRequirements.map(([itemType, itemAmount], i) => {
                     return <li key={i}>{CLIENT_ITEM_INFO_RECORD[itemType].name} x{itemAmount}</li>
                  })}
               </ul>
            </div>
            <button onClick={() => research()} className="research-button">Research</button>
         </> : null}
      </div>
   </div>;
}

interface TechDetailsProps {
   readonly techID: TechID;
}
const TechDetails = ({ techID }: TechDetailsProps) => {
   const techInfo = getTechByID(techID);
   
   return <div id="tech-details">
      <h2 className="name">{techInfo.name}</h2>
      <div className="description">{techInfo.description}</div>
      <p className="list-before">Unlocks the following items:</p>
      <ul>
         {techInfo.unlockedItems.map((itemType, i) => {
            return <li key={i}>
               <img src={getItemTypeImage(itemType)} alt="" />
               {CLIENT_ITEM_INFO_RECORD[itemType].name}
            </li>;
         })}
      </ul>
   </div>;
}

export let updateTechTree: () => void;

const TechTree = () => {
   const [isVisible, setIsVisible] = useState(false);
   const changeVisibility = useRef<() => void>();
   const hasLoaded = useRef(false);
   const [positionX, setPositionX] = useState(0);
   const [positionY, setPositionY] = useState(0);
   const lastDragX = useRef(0);
   const lastDragY = useRef(0);
   const isDragging = useRef(false);
   const scrollFunc = useRef<(e: WheelEvent) => void>();
   const [zoom, setZoom] = useState(1);
   const [, forceUpdate] = useReducer(x => x + 1, 0);
   const [hoveredTech, setHoveredTech] = useState<TechID | null>(null);

   useEffect(() => {
      if (!hasLoaded.current) {
         updateTechTree = (): void => {
            forceUpdate();
         }
         
         // @Memleak: Remove the listener when the component is unmounted
         addKeyListener("p", () => {
            changeVisibility.current!();
         });
         
         document.addEventListener("wheel", e => {
            scrollFunc.current!(e);
         });
      }
      hasLoaded.current = true;
   }, []);

   useEffect(() => {
      changeVisibility.current = (): void => {
         if (!isVisible) {
            document.getElementById("tech-tree-canvas")!.classList.remove("hidden");
         } else {
            document.getElementById("tech-tree-canvas")!.classList.add("hidden");
         }
         setIsVisible(!isVisible);
      }
   }, [isVisible]);

   useEffect(() => {
      scrollFunc.current = (e: WheelEvent): void => {
         if (e.deltaY > 0) {
            const newZoom = zoom / 1.2;
            setZoom(newZoom);
            setTechTreeZoom(newZoom);
         } else {
            const newZoom = zoom * 1.2;
            setZoom(newZoom);
            setTechTreeZoom(newZoom);
         }
      }
   }, [zoom]);

   const onMouseDown = (e: MouseEvent): void => {
      isDragging.current = true;
      lastDragX.current = e.clientX;
      lastDragY.current = e.clientY;
   }

   const onMouseMove = useCallback((e: MouseEvent): void => {
      if (!isDragging.current) {
         return;
      }
      const dragX = e.clientX - lastDragX.current;
      const dragY = e.clientY - lastDragY.current;

      lastDragX.current = e.clientX;
      lastDragY.current = e.clientY;

      const x = positionX + dragX * 2;
      const y = positionY + dragY * 2;
      setPositionX(x);
      setPositionY(y);
      setTechTreeX(x);
      setTechTreeY(y);
   }, [positionX, positionY]);

   const onMouseUp = (): void => {
      isDragging.current = false;
   }

   const onTechEnter = (tech: TechInfo): void => {
      setHoveredTech(tech.id);
   }
   const onTechLeave = (): void => {
      setHoveredTech(null);
   }

   if (!isVisible) {
      return null;
   }
   
   return <div id="tech-tree" onMouseDown={e => onMouseDown(e.nativeEvent)} onMouseMove={e => onMouseMove(e.nativeEvent)} onMouseUp={() => onMouseUp()}>
      {TECHS.filter(tech => techIsDirectlyAccessible(tech)).map((techInfo, i) => {
         return <Tech techInfo={techInfo} positionX={positionX} positionY={positionY} zoom={zoom} onMouseEnter={() => onTechEnter(techInfo)} onMouseLeave={() => onTechLeave()} key={i} />
      })}

      {hoveredTech !== null ? (
         <TechDetails techID={hoveredTech} />
      ) : null}
   </div>;
}

export default TechTree;