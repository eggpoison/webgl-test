import { ItemType } from "webgl-test-shared";

export type ClientItemInfo = {
   readonly textureSrc: string;
}

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   wooden_sword: {
      textureSrc: "raw-beef.png"
   },
   berry: {
      textureSrc: "raw-beef.png"
   },
   raw_beef: {
      textureSrc: "raw-beef.png"
   },
   cooked_beef: {
      textureSrc: "raw-beef.png"
   }
};

export default CLIENT_ITEM_INFO_RECORD