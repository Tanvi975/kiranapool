import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ridersApi } from "../services/api";
import "./RidersPage.css";

const emptyForm = {
    name: "",
    phone: "",
    vehicleType: "bike",
    lat: "",
    lng: "",
    isAvailable: true,
};

function unwrap(result) {
    return result?.data?.rider ||
        result?.rider ||
        result?.data ||
        result;
}

function unwrapList(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.riders)) return result.riders;
    if (Array.isArray(result?.data?.riders)) return result.data.riders;
    return [];
}

function vehicleLabel(type) {
    const labels = {
        bike: "Motorbike",
        scooter: "Scooter",
        cycle: "Bicycle",
        other: "Other vehicle",
    };
    return labels[type] || "Vehicle not specified";
}

function VehicleIcon({ type }) {
    const icons = {
        bike: "🏍️",
        scooter: "🛵",
        cycle: "🚲",
        other: "🚚",
    };

    return <span aria-hidden="true">{icons[type] || "🚚"}</span>;
}

export default function RidersPage() {
    const { user } = useAuth();
    const isRider = user?.role === "rider";

    const [riders, setRiders] = useState([]);
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(false);
    const [profileMissing, setProfileMissing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const fillForm = (rider) => {
        setForm({
            name: rider?.name || "",
            phone: rider?.phone || "",
            vehicleType: rider?.vehicleType || "bike",
            lat: rider?.location?.lat ?? "",
            lng: rider?.location?.lng ?? "",
            isAvailable: rider?.isAvailable ?? true,
        });
    };

    const loadPage = useCallback(async () => {
        setLoading(true);
        setError("");
        setMessage("");

        try {
            if (isRider) {
                try {
                    const result = await ridersApi.getMe();
                    const ownProfile = unwrap(result);

                    setProfile(ownProfile);
                    setProfileMissing(false);
                    fillForm(ownProfile);
                } catch (err) {
                    if (
                        err.message?.includes("404") ||
                        err.message?.toLowerCase().includes("not found") ||
                        err.message?.toLowerCase().includes("not created")
                    ) {
                        setProfile(null);
                        setProfileMissing(true);
                        fillForm(null);
                    } else {
                        throw err;
                    }
                }
            } else {
                const result = await ridersApi.getAll();
                setRiders(unwrapList(result));
            }
        } catch (err) {
            setError(err.message || "Riders load nahi ho paaye.");
        } finally {
            setLoading(false);
        }
    }, [isRider]);

    useEffect(() => {
        loadPage();
    }, [loadPage]);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        const lat = Number(form.lat);
        const lng = Number(form.lng);

        if (!form.name.trim() || !form.phone.trim()) {
            setError("Name aur phone required hain.");
            return;
        }

        if (
            form.lat === "" ||
            form.lng === "" ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {
            setError("Valid latitude aur longitude enter karo.");
            return;
        }

        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim(),
            vehicleType: form.vehicleType,
            location: { lat, lng },
        };

        setSaving(true);

        try {
            if (profile) {
                payload.isAvailable = form.isAvailable;
                const result = await ridersApi.updateMe(payload);
                const updatedProfile = unwrap(result);

                setProfile(updatedProfile);
                fillForm(updatedProfile);
                setMessage("Rider profile updated successfully.");
            } else {
                const result = await ridersApi.create(payload);
                const newProfile = unwrap(result);

                setProfile(newProfile);
                setProfileMissing(false);
                fillForm(newProfile);
                setMessage("Rider profile created successfully.");
            }

            setEditing(false);
        } catch (err) {
            setError(err.message || "Profile save nahi ho paayi.");
        } finally {
            setSaving(false);
        }
    };

    const toggleAvailability = async () => {
        try {
            setError("");
            setMessage("");

            const result = await ridersApi.updateMe({
                isAvailable: !profile.isAvailable,
            });

            const updated = unwrap(result);
            setProfile(updated);
            fillForm(updated);
            setMessage("Availability updated successfully.");
        } catch (err) {
            setError(err.message || "Availability update nahi hui.");
        }
    };

    const openRider = async (id) => {
        setError("");
        setMessage("");

        try {
            const result = await ridersApi.getById(id);
            const rider = unwrap(result);

            window.alert(
                `Name: ${rider.name || "—"}\n` +
                `Phone: ${rider.phone || "—"}\n` +
                `Vehicle: ${rider.vehicleType || "—"}\n` +
                `Availability: ${rider.isAvailable ? "Available" : "Unavailable"}`
            );
        } catch (err) {
            setError(err.message || "Rider details load nahi hue.");
        }
    };

    const filteredRiders = riders.filter((rider) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
            (rider.name || "").toLowerCase().includes(query) ||
            (rider.phone || "").toLowerCase().includes(query) ||
            (rider.vehicleType || "").toLowerCase().includes(query);

        const matchesFilter =
            filter === "all" ||
            (filter === "available" && rider.isAvailable) ||
            (filter === "unavailable" && !rider.isAvailable);

        return matchesSearch && matchesFilter;
    });

    const availableCount = riders.filter((rider) => rider.isAvailable).length;

    if (loading) {
        return (
            <main className="riders-page">
                <div className="riders-container">
                    <div className="riders-loading">
                        <span className="riders-spinner" />
                        <p>Loading rider information...</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="riders-page">
            <div className="riders-container">
                <header className="riders-page-header">
                    <div>
                        <div className="riders-eyebrow">
                            KIRANAPOOL <span> / </span> OPERATIONS
                        </div>
                        <h1>{isRider ? "My Rider Profile" : "Rider Management"}</h1>
                        <p className="riders-subtitle">
                            {isRider
                                ? "Manage your delivery profile, vehicle and availability."
                                : "Manage your delivery fleet and monitor rider availability."}
                        </p>
                    </div>

                    <div className="riders-header-mark" aria-hidden="true">
                        <span>↗</span>
                    </div>
                </header>

                {error && (
                    <div className="riders-alert riders-alert-error" role="alert">
                        <span>!</span>
                        <p>{error}</p>
                        <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
                            ×
                        </button>
                    </div>
                )}

                {message && (
                    <div className="riders-alert riders-alert-success" role="status">
                        <span>✓</span>
                        <p>{message}</p>
                        <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">
                            ×
                        </button>
                    </div>
                )}

                {isRider ? (
                    <section className="rider-own-section">
                        {profile && !editing ? (
                            <>
                                <div className="rider-own-hero">
                                    <div className="rider-own-avatar">
                                        {(profile.name || "R").trim().charAt(0).toUpperCase()}
                                    </div>

                                    <div className="rider-own-identity">
                                        <span className="riders-eyebrow">YOUR RIDER ACCOUNT</span>
                                        <h2>{profile.name || "Delivery Rider"}</h2>
                                        <p>{vehicleLabel(profile.vehicleType)}</p>
                                        <span className={`rider-availability ${profile.isAvailable ? "is-available" : "is-unavailable"}`}>
                                            <span className="availability-dot" />
                                            {profile.isAvailable ? "Available for deliveries" : "Currently unavailable"}
                                        </span>
                                    </div>

                                    <div className="rider-own-actions">
                                        <button className="riders-btn riders-btn-secondary" onClick={() => { fillForm(profile); setEditing(true); }}>
                                            <span>✎</span> Edit profile
                                        </button>
                                        <button
                                            className={`riders-btn ${profile.isAvailable ? "riders-btn-danger" : "riders-btn-primary"}`}
                                            onClick={toggleAvailability}
                                        >
                                            {profile.isAvailable ? "Go unavailable" : "Go available"}
                                        </button>
                                    </div>
                                </div>

                                <div className="rider-profile-grid">
                                    <article className="rider-info-card">
                                        <span className="rider-info-icon">☎</span>
                                        <span className="rider-info-label">PHONE NUMBER</span>
                                        <strong>{profile.phone || "Not provided"}</strong>
                                    </article>

                                    <article className="rider-info-card">
                                        <span className="rider-info-icon">⌖</span>
                                        <span className="rider-info-label">LATITUDE</span>
                                        <strong>{profile.location?.lat ?? "Not provided"}</strong>
                                    </article>

                                    <article className="rider-info-card">
                                        <span className="rider-info-icon">⌖</span>
                                        <span className="rider-info-label">LONGITUDE</span>
                                        <strong>{profile.location?.lng ?? "Not provided"}</strong>
                                    </article>
                                </div>
                            </>
                        ) : (
                            <section className="riders-panel rider-form-panel">
                                <div className="riders-panel-heading">
                                    <div>
                                        <span className="riders-eyebrow">RIDER DETAILS</span>
                                        <h2>{profile ? "Edit your profile" : "Create your rider profile"}</h2>
                                        <p>Enter your contact details, vehicle and delivery location.</p>
                                    </div>
                                    <div className="rider-form-icon">✎</div>
                                </div>

                                {profileMissing && (
                                    <div className="riders-form-note">
                                        Your rider profile has not been created yet. Complete the form to get started.
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="riders-form">
                                    <label className="riders-field">
                                        <span>Full name</span>
                                        <input name="name" value={form.name} onChange={handleChange} placeholder="Enter your full name" required />
                                    </label>

                                    <label className="riders-field">
                                        <span>Phone number</span>
                                        <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Enter your phone number" required />
                                    </label>

                                    <label className="riders-field">
                                        <span>Vehicle type</span>
                                        <select name="vehicleType" value={form.vehicleType} onChange={handleChange}>
                                            <option value="bike">Motorbike</option>
                                            <option value="scooter">Scooter</option>
                                            <option value="cycle">Bicycle</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </label>

                                    <label className="riders-field">
                                        <span>Latitude</span>
                                        <input name="lat" type="number" step="any" value={form.lat} onChange={handleChange} placeholder="e.g. 28.6139" required />
                                    </label>

                                    <label className="riders-field">
                                        <span>Longitude</span>
                                        <input name="lng" type="number" step="any" value={form.lng} onChange={handleChange} placeholder="e.g. 77.2090" required />
                                    </label>

                                    {profile && (
                                        <label className="riders-checkbox-field">
                                            <input name="isAvailable" type="checkbox" checked={form.isAvailable} onChange={handleChange} />
                                            <span>Available for deliveries</span>
                                        </label>
                                    )}

                                    <div className="riders-form-actions">
                                        <button className="riders-btn riders-btn-primary" type="submit" disabled={saving}>
                                            {saving ? "Saving..." : profile ? "Save changes" : "Create rider profile"}
                                        </button>

                                        {profile && (
                                            <button
                                                className="riders-btn riders-btn-secondary"
                                                type="button"
                                                onClick={() => { fillForm(profile); setEditing(false); setError(""); }}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </section>
                        )}
                    </section>
                ) : (
                    <>
                        <section className="riders-stats-grid">
                            <article className="riders-stat-card">
                                <div className="riders-stat-top">
                                    <span className="riders-stat-label">TOTAL RIDERS</span>
                                    <span className="riders-stat-icon">♙</span>
                                </div>
                                <strong>{riders.length}</strong>
                                <span className="riders-stat-foot">Registered delivery partners</span>
                            </article>

                            <article className="riders-stat-card">
                                <div className="riders-stat-top">
                                    <span className="riders-stat-label">AVAILABLE</span>
                                    <span className="riders-stat-icon stat-icon-green">✓</span>
                                </div>
                                <strong>{availableCount}</strong>
                                <span className="riders-stat-foot">Ready for deliveries</span>
                            </article>

                            <article className="riders-stat-card">
                                <div className="riders-stat-top">
                                    <span className="riders-stat-label">UNAVAILABLE</span>
                                    <span className="riders-stat-icon stat-icon-muted">−</span>
                                </div>
                                <strong>{riders.length - availableCount}</strong>
                                <span className="riders-stat-foot">Not currently available</span>
                            </article>
                        </section>

                        <section className="riders-panel riders-directory-panel">
                            <div className="riders-directory-heading">
                                <div>
                                    <span className="riders-eyebrow">FLEET OVERVIEW</span>
                                    <h2>Rider directory</h2>
                                    <p>View registered riders and their current availability.</p>
                                </div>
                                <span className="riders-total-pill">{riders.length} riders</span>
                            </div>

                            <div className="riders-toolbar">
                                <div className="riders-search">
                                    <span aria-hidden="true">⌕</span>
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search by name, phone or vehicle..."
                                        aria-label="Search riders"
                                    />
                                    {search && (
                                        <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>
                                    )}
                                </div>

                                <select
                                    className="riders-filter"
                                    value={filter}
                                    onChange={(event) => setFilter(event.target.value)}
                                    aria-label="Filter riders by availability"
                                >
                                    <option value="all">All riders</option>
                                    <option value="available">Available</option>
                                    <option value="unavailable">Unavailable</option>
                                </select>
                            </div>

                            {filteredRiders.length === 0 ? (
                                <div className="riders-empty-state">
                                    <div className="riders-empty-icon">♙</div>
                                    <h3>{riders.length === 0 ? "No riders registered yet" : "No matching riders"}</h3>
                                    <p>
                                        {riders.length === 0
                                            ? "Registered delivery riders will appear here."
                                            : "Try another search term or change the availability filter."}
                                    </p>
                                    {(search || filter !== "all") && (
                                        <button className="riders-btn riders-btn-secondary" onClick={() => { setSearch(""); setFilter("all"); }}>
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="riders-directory-grid">
                                    {filteredRiders.map((rider) => (
                                        <article className="rider-directory-card" key={rider._id || rider.id}>
                                            <div className="rider-card-top">
                                                <div className="rider-card-avatar">
                                                    {(rider.name || "R").trim().charAt(0).toUpperCase()}
                                                </div>
                                                <span className={`rider-availability ${rider.isAvailable ? "is-available" : "is-unavailable"}`}>
                                                    <span className="availability-dot" />
                                                    {rider.isAvailable ? "Available" : "Unavailable"}
                                                </span>
                                            </div>

                                            <div className="rider-card-identity">
                                                <h3>{rider.name || "Unnamed Rider"}</h3>
                                                <p>{rider.phone || "Phone not provided"}</p>
                                            </div>

                                            <div className="rider-card-vehicle">
                                                <span className="rider-vehicle-icon">
                                                    <VehicleIcon type={rider.vehicleType} />
                                                </span>
                                                <div>
                                                    <span>VEHICLE</span>
                                                    <strong>{vehicleLabel(rider.vehicleType)}</strong>
                                                </div>
                                            </div>

                                            <div className="rider-card-footer">
                                                <span className="rider-card-id">
                                                    ID · {String(rider._id || rider.id || "").slice(-7) || "—"}
                                                </span>
                                                <button className="rider-details-btn" onClick={() => openRider(rider._id || rider.id)}>
                                                    View details <span>↗</span>
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
