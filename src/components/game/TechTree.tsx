import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { addKeyListener } from "../../keyboard-input";
import { ItemType, TECHS, TechID, TechInfo } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import Game from "../../Game";
import Client from "../../client/Client";
import { setTechTreeX, setTechTreeY, setTechTreeZoom, techIsDirectlyAccessible } from "../../rendering/tech-tree-rendering";
import OPTIONS from "../../options";

let hoveredTechID: TechID | null = null;

export function techIsHovered(techID: TechID): boolean {
   return techID === hoveredTechID;
}

const selectTech = (techID: TechID): void => {
   Client.sendSelectTech(techID);
}
   
const researchTech = (techID: TechID): void => {
   if (Game.tribe.hasUnlockedTech(techID)) {
      return;
   }
   
   Client.sendUnlockTech(techID);
}

interface TechTooltipProps {
   readonly techInfo: TechInfo;
   readonly techPositionX: number;
   readonly techPositionY: number;
   readonly zoom: number;
}
const TechTooltip = ({ techInfo, techPositionX, techPositionY, zoom }: TechTooltipProps) => {
   const tooltipRef = useRef<HTMLDivElement | null>(null);
   
   useEffect(() => {
      if (tooltipRef.current !== null) {
         const tooltip = tooltipRef.current;
         tooltip.style.left = `calc(50% + (${techInfo.positionX + 5}rem + ${techPositionX}px) * ${zoom})`;
         tooltip.style.top = `calc(50% + (${-techInfo.positionY}rem + ${techPositionY}px) * ${zoom})`;
      }
   }, [techInfo.positionX, techInfo.positionY, techPositionX, techPositionY, zoom]);

   const studyProgress = Game.tribe.techTreeUnlockProgress[techInfo.id]?.studyProgress || 0;
   
   return <div ref={tooltipRef} id="tech-tooltip">
      <div className="container">
         <h2 className="name">{techInfo.name}</h2>
         <p className="description">{techInfo.description}</p>

         <div className="details">
            <ul>
               {Object.entries(techInfo.researchItemRequirements).map(([itemType, itemAmount], i) => {
                  const itemProgress = (Game.tribe.techTreeUnlockProgress[techInfo.id]?.itemProgress.hasOwnProperty(itemType)) ? Game.tribe.techTreeUnlockProgress[techInfo.id]!.itemProgress[itemType as unknown as ItemType] : 0;
                  return <li key={i}>{CLIENT_ITEM_INFO_RECORD[itemType as unknown as ItemType].name} {itemProgress}/{itemAmount}</li>
               })}
            </ul>
         </div>
      </div>
      {studyProgress < techInfo.researchStudyRequirements ? (
         <div className="container research-container">
            <p className="research-progress">{studyProgress}/{techInfo.researchStudyRequirements}</p>
            <div className="study-progress-bar-bg">
               <div className="study-progress-bar"></div>
            </div>
         </div>
      ) : null}
   </div>;
}

interface TechProps {
   readonly techInfo: TechInfo;
   readonly positionX: number;
   readonly positionY: number;
   readonly zoom: number;
}
const Tech = ({ techInfo, positionX, positionY, zoom }: TechProps) => {
   const elementRef = useRef<HTMLDivElement | null>(null);
   const [isHovered, setIsHovered] = useState(false);

   useEffect(() => {
      if (elementRef.current !== null) {
         const element = elementRef.current;
         element.style.left = `calc(50% + (${techInfo.positionX}rem + ${positionX}px) * ${zoom})`;
         element.style.top = `calc(50% + (${-techInfo.positionY}rem + ${positionY}px) * ${zoom})`;
      }
   }, [techInfo.positionX, techInfo.positionY, positionX, positionY, zoom]);

   const isUnlocked = Game.tribe.hasUnlockedTech(techInfo.id);
   const isSelected = Game.tribe.selectedTechID === techInfo.id;

   const onMouseEnter = (): void => {
      setIsHovered(true);
   }

   const onMouseLeave = (): void => {
      setIsHovered(false);
   }

   const onClick = (): void => {
      if (isUnlocked) {
         return;
      }

      if (techInfo.researchStudyRequirements > 0) {
         selectTech(techInfo.id);
      }

      researchTech(techInfo.id);
   }

   const onRightClick = (e: MouseEvent): void => {
      if (isUnlocked) {
         return;
      }
      
      if (techInfo.researchStudyRequirements > 0) {
         selectTech(techInfo.id);
      }
      e.preventDefault();
   }

   return <>
      <div ref={elementRef} onClick={onClick} onContextMenu={e => onRightClick(e.nativeEvent)} className={`tech${isUnlocked ? " unlocked" : ""}${isSelected ? " selected" : ""}`} onMouseEnter={() => onMouseEnter()} onMouseLeave={() => onMouseLeave()}>
         <div className="icon-wrapper">
            <img src={require("../../images/tech-tree/" + techInfo.iconSrc)} alt="" className="icon" draggable={false} />
         </div>
      </div>
      {isHovered ? (
         <TechTooltip techInfo={techInfo} techPositionX={positionX} techPositionY={positionY} zoom={zoom} />
      ) : null}
   </>;
}

export let updateTechTree: () => void = () => {};

export let techTreeIsOpen: () => boolean;
export let closeTechTree: () => void;

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

   useEffect(() => {
      if (!hasLoaded.current) {
         updateTechTree = (): void => {
            forceUpdate();
         }

         closeTechTree = () => {
            changeVisibility.current!();
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
      techTreeIsOpen = (): boolean => {
         return isVisible;
      }

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

   if (!isVisible) {
      return null;
   }
   
   return <div id="tech-tree" onMouseDown={e => onMouseDown(e.nativeEvent)} onMouseMove={e => onMouseMove(e.nativeEvent)} onMouseUp={() => onMouseUp()}>
      {TECHS.filter(tech => OPTIONS.showAllTechs || techIsDirectlyAccessible(tech)).map((techInfo, i) => {
         return <Tech techInfo={techInfo} positionX={positionX} positionY={positionY} zoom={zoom} key={i} />
      })}
   </div>;
}

export default TechTree;