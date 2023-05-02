import { useCallback, useReducer, useState } from "react";
import OPTIONS from "../../../options";
import { closeSettingsMenu } from "../GameScreen";

type BaseSettingsButton = {
   readonly type: string;
   readonly text: string;
}

interface OpenMenuSettingsButton extends BaseSettingsButton {
   readonly type: "openMenu";
   readonly menuName?: string;
}

interface CloseSettingsButton extends BaseSettingsButton {
   readonly type: "close";
}

interface OnClickSettingsButton extends BaseSettingsButton {
   readonly type: "onClick";
   onClick(): void;
}

interface OptionSettingsButton extends BaseSettingsButton {
   readonly type: "option";
   readonly option: keyof typeof OPTIONS;
}

type SettingsButton = OpenMenuSettingsButton | CloseSettingsButton | OnClickSettingsButton | OptionSettingsButton;

type SettingsMenu = {
   readonly name: string;
   readonly buttons: ReadonlyArray<Array<SettingsButton>>;
   readonly submenus?: ReadonlyArray<SettingsMenu>;
}

const BASE_MENU: SettingsMenu = {
   name: "Settings",
   buttons: [
      [
         {
            type: "openMenu",
            text: "Video settings"
         },
         {
            type: "openMenu",
            text: "Audio settings"
         }
      ],
      [
         {
            type: "openMenu",
            text: "Miscellaneous"
         }
      ],
      [
         {
            type: "close",
            text: "Escape"
         }
      ]
   ]
}

const getMenu = (menuName: string): SettingsMenu => {
   const menusToCheck: Array<SettingsMenu> = [BASE_MENU];

   while (menusToCheck.length > 0) {
      const menu = menusToCheck[0];

      if (menu.name === menuName) {
         return menu;
      }

      menusToCheck.splice(0, 1);

      if (typeof menu.submenus !== "undefined") {
         for (const submenu of menu.submenus) {
            menusToCheck.push(submenu);
         }   
      }
   }

   throw new Error(`Couldn't find menu with name '${menuName}'`);
}

const getParentMenu = (menu: SettingsMenu): SettingsMenu | null => {
   if (menu === BASE_MENU) return null;

   const menusToCheck: Array<SettingsMenu> = [BASE_MENU];

   while (menusToCheck.length > 0) {
      const currentMenu = menusToCheck[0];
      menusToCheck.splice(0, 1);

      if (typeof currentMenu.submenus !== "undefined") {
         for (const submenu of currentMenu.submenus) {
            if (submenu === menu) return currentMenu;
            menusToCheck.push(submenu);
         }
      }
   }

   throw new Error(`Couldn't find parent menu of menu with name '${menu.name}'`);
}

const Settings = () => {
   const [currentMenu, setCurrentMenu] = useState<SettingsMenu>(BASE_MENU);
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   const changeCurrentMenu = (newMenuName: string): void => {
      const menu = getMenu(newMenuName);
      setCurrentMenu(menu);
   }

   const closeCurrentMenu = useCallback((): void => {
      const parentMenu = getParentMenu(currentMenu);
      if (parentMenu === null) {
         closeSettingsMenu();
      } else {
         setCurrentMenu(parentMenu);
      }
   }, [currentMenu]);

   return (
      <div id="settings">
         <div className="content">
            <h1>{currentMenu.name}</h1>

            {currentMenu.buttons.map((buttons, i) => {
               return <div className="row" key={i}>
                  { /* eslint-disable-next-line array-callback-return */ }
                  { buttons.map((button, j) => {
                     switch (button.type) {
                        case "onClick": {
                           return <button onClick={button.onClick} key={j}>{button.text}</button>
                        }
                        case "close": {
                           return <button onClick={closeCurrentMenu} key={j}>{button.text}</button>
                        }
                        case "openMenu": {
                           return <button onClick={typeof button.menuName !== "undefined" ? () => changeCurrentMenu(button.menuName!) : undefined} key={j}>{button.text}</button>
                        }
                        case "option": {
                           const onClick = (): void => {
                              // Flip the option
                              OPTIONS[button.option] = !OPTIONS[button.option];

                              // Force rerender
                              forceUpdate();
                           }

                           return <button onClick={() => onClick()} key={j}>{button.text}: {OPTIONS[button.option] ? "On" : "Off"}</button>
                        }
                     }
                  })}
               </div>;
            })}
         </div>

         <div className="bg"></div>
      </div>
   )
}

export default Settings;