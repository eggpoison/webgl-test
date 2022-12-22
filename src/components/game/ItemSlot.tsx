import { ItemType } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";

interface ItemSlotParams {
   readonly picturedItemType?: ItemType;
   readonly itemCount?: number;
}

const ItemSlot = ({ picturedItemType, itemCount }: ItemSlotParams) => {
   return <div className="item-slot">
      {typeof picturedItemType !== "undefined" ? (
         <img src={require("../../images/items/" + CLIENT_ITEM_INFO_RECORD[picturedItemType].textureSrc)} alt="" />
      ) : null}
   </div>;
}

export default ItemSlot;