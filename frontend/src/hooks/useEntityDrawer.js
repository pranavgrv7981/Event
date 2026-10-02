import { useState, useCallback } from "react";
import {
  getSessionById,
  getVenueById,
  getSpeakerById,
  getVolunteerById,
  getEquipmentById,
} from "../services/api";

export function useEntityDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [entityType, setEntityType] = useState("session");
  const [entityData, setEntityData] = useState(null);
  const [loading, setLoading] = useState(false);

  const openEntity = useCallback(async (type, dataOrId) => {
    setEntityType(type);
    setIsOpen(true);

    if (dataOrId && typeof dataOrId === "object") {
      setEntityData(dataOrId);
      return;
    }

    // It's an ID string
    try {
      setLoading(true);
      let data = null;
      if (type === "session") {
        data = await getSessionById(dataOrId);
      } else if (type === "venue") {
        data = await getVenueById(dataOrId);
      } else if (type === "speaker") {
        data = await getSpeakerById(dataOrId);
      } else if (type === "volunteer") {
        data = await getVolunteerById(dataOrId);
      } else if (type === "equipment") {
        data = await getEquipmentById(dataOrId);
      }
      setEntityData(data);
    } catch (err) {
      console.error(`Failed to load ${type} with ID ${dataOrId}:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setEntityData(null);
  }, []);

  return {
    isOpen,
    entityType,
    entityData,
    loading,
    openEntity,
    closeDrawer,
  };
}
