import api from "./api";

export const getMapOverview = async() => {
    const response = await api.get("/api/map/overview");
    return response.data;
};

export const updateMyLocation = async(lat, lng) => {
    const response = await api.patch("/api/riders/me", {
        location: { lat, lng },
    });

    return response.data;
};