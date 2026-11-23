
import { db, auth } from "./firebase-config.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";


/* =====================================
   ELEMENTS
===================================== */

const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

const pageTitle = document.getElementById("pageTitle");

const logoutButton = document.getElementById("logoutButton");

const vehicleForm = document.getElementById("vehicleForm");
const bookingFilter = document.getElementById("bookingFilter");

let currentAdmin = null;
let vehicles = [];
let bookings = [];


/* =====================================
   GENERAL HELPERS
===================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


function formatPrice(value) {
    const price = Number(value);

    if (!Number.isFinite(price)) {
        return "Not set";
    }

    return "₦" + price.toLocaleString("en-NG");
}


function formatPriceUnit(unit) {
    const units = {
        hour: "per hour",
        day: "per day",
        week: "per week",
        month: "per month"
    };

    return units[unit] || "";
}


function showMessage(element, message, type = "error") {
    if (!element) return;

    element.textContent = message;
    element.className = "message " + type;
}


function showLoginMessage(message, type = "error") {
    showMessage(loginMessage, message, type);
}


/* =====================================
   ADMIN VERIFICATION
===================================== */

async function verifyAdmin(user) {
    const adminRef = doc(db, "admins", user.uid);
    const adminSnapshot = await getDoc(adminRef);

    return adminSnapshot.exists();
}


/* =====================================
   LOGIN
===================================== */

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = adminEmail.value.trim();
    const password = adminPassword.value;

    if (!email || !password) {
        showLoginMessage("Enter your email and password.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const allowed = await verifyAdmin(result.user);

        if (!allowed) {
            await signOut(auth);

            showLoginMessage(
                "This account does not have administrator access."
            );

            return;
        }

        currentAdmin = result.user;

        await showDashboard();

    } catch (error) {
        console.error("Login error:", error);

        showLoginMessage(
            "Login failed. Check your email and password."
        );

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign in";
    }
});


/* =====================================
   AUTHENTICATION STATE
===================================== */

onAuthStateChanged(auth, async function (user) {

    if (!user) {
        currentAdmin = null;
        showLoginScreen();
        return;
    }

    try {
        const allowed = await verifyAdmin(user);

        if (!allowed) {
            await signOut(auth);
            showLoginScreen();
            return;
        }

        currentAdmin = user;

        await showDashboard();

    } catch (error) {
        console.error("Admin verification error:", error);

        await signOut(auth);
        showLoginScreen();
    }

});


/* =====================================
   SCREEN CONTROL
===================================== */

function showLoginScreen() {
    loginScreen.hidden = false;
    dashboard.hidden = true;

    if (loginMessage) {
        loginMessage.textContent = "";
    }
}


async function showDashboard() {
    loginScreen.hidden = true;
    dashboard.hidden = false;

    const email = currentAdmin?.email || "Administrator";

    const emailDisplay = document.getElementById("adminEmailDisplay");
    const settingsEmail = document.getElementById("settingsAdminEmail");

    if (emailDisplay) {
        emailDisplay.textContent = email;
    }

    if (settingsEmail) {
        settingsEmail.textContent = email;
    }

    await loadDashboardData();
}


/* =====================================
   LOGOUT
===================================== */

logoutButton.addEventListener("click", async function () {

    try {
        await signOut(auth);

        currentAdmin = null;

        showLoginScreen();

    } catch (error) {
        console.error("Logout error:", error);
        alert("Could not sign out. Please try again.");
    }

});


/* =====================================
   NAVIGATION
===================================== */

document.querySelectorAll(".nav-item[data-section]").forEach(function (item) {

    item.addEventListener("click", function () {

        const sectionName = item.dataset.section;

        switchSection(sectionName);

    });

});


document.querySelectorAll("[data-section]:not(.nav-item)").forEach(function (item) {

    item.addEventListener("click", function () {

        switchSection(item.dataset.section);

    });

});


function switchSection(sectionName) {

    const target = document.getElementById(sectionName);

    if (!target || !target.classList.contains("dashboard-section")) {
        return;
    }

    document.querySelectorAll(".nav-item[data-section]").forEach(function (nav) {
        nav.classList.toggle(
            "active",
            nav.dataset.section === sectionName
        );
    });

    document.querySelectorAll(".dashboard-section").forEach(function (section) {
        section.classList.remove("active");
    });

    target.classList.add("active");

    if (pageTitle) {
        const activeNav = document.querySelector(
            `.nav-item[data-section="${sectionName}"]`
        );

        pageTitle.textContent = activeNav
            ? activeNav.textContent.trim()
            : sectionName;
    }

    closeSidebar();
}


/* =====================================
   MOBILE SIDEBAR
===================================== */

if (sidebarToggle && sidebar) {

    sidebarToggle.addEventListener("click", function () {

        const isOpen = sidebar.classList.toggle("open");

        sidebarToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

    });

}


function closeSidebar() {

    if (!sidebar || !sidebarToggle) return;

    sidebar.classList.remove("open");

    sidebarToggle.setAttribute("aria-expanded", "false");

}


/* =====================================
   LOAD DASHBOARD DATA
===================================== */

async function loadDashboardData() {

    await Promise.all([
        loadVehicles(),
        loadBookings()
    ]);

    updateStatistics();

}


/* =====================================
   VEHICLES
===================================== */

async function loadVehicles() {

    const container = document.getElementById("vehiclesList");

    if (container) {
        container.textContent = "Loading vehicles...";
    }

    try {

        const snapshot = await getDocs(
            collection(db, "vehicles")
        );

        vehicles = snapshot.docs.map(function (item) {

            return {
                id: item.id,
                ...item.data()
            };

        });

        displayVehicles();
        updateStatistics();

    } catch (error) {

        console.error("Vehicle loading error:", error);

        if (container) {
            container.textContent = "Could not load vehicles.";
        }

    }

}


function displayVehicles() {

    const container = document.getElementById("vehiclesList");

    if (!container) return;

    if (vehicles.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No vehicles have been added yet.
            </div>
        `;

        return;
    }

    container.innerHTML = vehicles.map(function (vehicle) {

        return `
            <div class="content-card">

                <h3>${escapeHTML(vehicle.name || "Unnamed vehicle")}</h3>

                <p>Category: ${escapeHTML(vehicle.category || "Not specified")}</p>

                <p>Status: ${escapeHTML(vehicle.status || "inactive")}</p>

                <p>
                    Price:
                    ${formatPrice(vehicle.price)}
                    ${escapeHTML(formatPriceUnit(vehicle.priceUnit))}
                </p>

                <p>
                    ${escapeHTML(vehicle.description || "No description")}
                </p>

                <div class="form-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        data-edit-vehicle="${escapeHTML(vehicle.id)}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        data-delete-vehicle="${escapeHTML(vehicle.id)}"
                    >
                        Delete
                    </button>

                </div>

            </div>
        `;

    }).join("");


    container.querySelectorAll("[data-edit-vehicle]").forEach(function (button) {

        button.addEventListener("click", function () {
            editVehicle(button.dataset.editVehicle);
        });

    });


    container.querySelectorAll("[data-delete-vehicle]").forEach(function (button) {

        button.addEventListener("click", function () {
            removeVehicle(button.dataset.deleteVehicle);
        });

    });

}


/* =====================================
   ADD VEHICLE
===================================== */

if (vehicleForm) {

    vehicleForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("vehicleName").value.trim();

        const category = document.getElementById("vehicleCategory").value;

        const description = document.getElementById("vehicleDescription").value.trim();

        const imageUrl = document.getElementById("vehicleImage").value.trim();

        const price = Number(document.getElementById("vehiclePrice").value);

        const priceUnit = document.getElementById("vehiclePriceUnit").value;

        const status = document.getElementById("vehicleStatus").value;

        const message = document.getElementById("vehicleMessage");

        if (
            !name ||
            !category ||
            !description ||
            !Number.isFinite(price) ||
            price < 0
        ) {

            showMessage(
                message,
                "Please enter valid vehicle details."
            );

            return;
        }


        if (imageUrl) {

            try {

                const parsedUrl = new URL(imageUrl);

                if (
                    parsedUrl.protocol !== "https:" &&
                    parsedUrl.protocol !== "http:"
                ) {
                    throw new Error("Invalid image URL");
                }

            } catch (error) {

                showMessage(
                    message,
                    "Enter a valid image URL."
                );

                return;
            }

        }


        const submitButton = vehicleForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Saving...";
        }


        try {

            await addDoc(collection(db, "vehicles"), {

                name,
                category,
                description,
                imageUrl,
                price,
                priceUnit,
                status,
                createdAt: serverTimestamp()

            });

            vehicleForm.reset();

            showMessage(
                message,
                "Vehicle added successfully.",
                "success"
            );

            await loadVehicles();

        } catch (error) {

            console.error("Vehicle save error:", error);

            showMessage(
                message,
                "Could not save vehicle. Check your connection and permissions."
            );

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Add vehicle";
            }

        }

    });

}


/* =====================================
   EDIT VEHICLE
===================================== */

async function editVehicle(vehicleId) {

    const vehicle = vehicles.find(function (item) {
        return item.id === vehicleId;
    });

    if (!vehicle) return;


    const name = prompt(
        "Vehicle name:",
        vehicle.name || ""
    );

    if (name === null) return;


    const category = prompt(
        "Vehicle category:",
        vehicle.category || ""
    );

    if (category === null) return;


    const description = prompt(
        "Vehicle description:",
        vehicle.description || ""
    );

    if (description === null) return;


    const priceText = prompt(
        "Rental price:",
        String(vehicle.price ?? 0)
    );

    if (priceText === null) return;


    const price = Number(priceText);

    if (
        !name.trim() ||
        !category.trim() ||
        !description.trim() ||
        !Number.isFinite(price) ||
        price < 0
    ) {

        alert("Invalid vehicle details.");
        return;
    }


    try {

        await updateDoc(
            doc(db, "vehicles", vehicleId),
            {
                name: name.trim(),
                category: category.trim(),
                description: description.trim(),
                price
            }
        );

        await loadVehicles();

        alert("Vehicle updated successfully.");

    } catch (error) {

        console.error("Vehicle update error:", error);

        alert("Could not update vehicle.");

    }

}


/* =====================================
   DELETE VEHICLE
===================================== */

async function removeVehicle(vehicleId) {

    const confirmed = confirm(
        "Are you sure you want to delete this vehicle?"
    );

    if (!confirmed) return;


    try {

        await deleteDoc(
            doc(db, "vehicles", vehicleId)
        );

        await loadVehicles();

        alert("Vehicle deleted successfully.");

    } catch (error) {

        console.error("Vehicle delete error:", error);

        alert("Could not delete vehicle.");

    }

}


/* =====================================
   BOOKINGS
===================================== */

async function loadBookings() {

    const container = document.getElementById("bookingsList");

    if (container) {
        container.textContent = "Loading rental enquiries...";
    }

    try {

        const snapshot = await getDocs(
            collection(db, "bookings")
        );

        bookings = snapshot.docs.map(function (item) {

            return {
                id: item.id,
                ...item.data()
            };

        });

        // Show newest enquiries first.
        bookings.sort(function (a, b) {

            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;

            return timeB - timeA;

        });

        displayBookings();
        displayRecentBookings();

        updateStatistics();

    } catch (error) {

        console.error("Booking loading error:", error);

        if (container) {
            container.textContent = "Could not load rental enquiries.";
        }

    }

}


/* =====================================
   DISPLAY BOOKINGS
===================================== */

function displayBookings() {

    const container = document.getElementById("bookingsList");

    if (!container) return;


    const selectedFilter = bookingFilter?.value || "all";

    const filteredBookings = bookings.filter(function (booking) {

        if (selectedFilter === "all") {
            return true;
        }

        return booking.status === selectedFilter;

    });


    if (filteredBookings.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No enquiries found for this filter.
            </div>
        `;

        return;
    }


    container.innerHTML = filteredBookings.map(function (booking) {

        const vehicle = vehicles.find(function (item) {
            return item.id === booking.vehicleId;
        });

        const vehicleName = booking.vehicleId === "any"
            ? "Any available vehicle"
            : vehicle?.name || booking.vehicleId || "Not specified";


        return `
            <div class="content-card">

                <h3>${escapeHTML(booking.customerName || "Customer")}</h3>

                <p>Phone: ${escapeHTML(booking.customerPhone || "Not provided")}</p>

                <p>Vehicle: ${escapeHTML(vehicleName)}</p>

                <p>Pickup: ${escapeHTML(booking.pickupDate || "")}</p>

                <p>Return: ${escapeHTML(booking.returnDate || "")}</p>

                <p>Message: ${escapeHTML(booking.message || "None")}</p>

                <p>
                    Status:
                    <span class="status">
                        ${escapeHTML(booking.status || "pending")}
                    </span>
                </p>

                <div class="form-actions">

                    <button
                        type="button"
                        class="primary-button"
                        data-booking-status="${escapeHTML(booking.id)}"
                        data-status="confirmed"
                    >
                        Confirm
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        data-booking-status="${escapeHTML(booking.id)}"
                        data-status="rejected"
                    >
                        Reject
                    </button>

                </div>

            </div>
        `;

    }).join("");


    container.querySelectorAll("[data-booking-status]").forEach(function (button) {

        button.addEventListener("click", async function () {

            await changeBookingStatus(
                button.dataset.bookingStatus,
                button.dataset.status
            );

        });

    });

}


/* =====================================
   RECENT BOOKINGS
===================================== */

function displayRecentBookings() {

    const container = document.getElementById("recentBookings");

    if (!container) return;


    if (bookings.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No rental enquiries have been received yet.
            </div>
        `;

        return;
    }


    const recent = bookings.slice(0, 5);


    container.innerHTML = recent.map(function (booking) {

        return `
            <div class="recent-booking-item">

                <h4>
                    ${escapeHTML(booking.customerName || "Customer")}
                </h4>

                <p>
                    ${escapeHTML(booking.pickupDate || "Pickup date unavailable")}
                    –
                    ${escapeHTML(booking.returnDate || "Return date unavailable")}
                </p>

                <span class="status">
                    ${escapeHTML(booking.status || "pending")}
                </span>

            </div>
        `;

    }).join("");

}


/* =====================================
   BOOKING FILTER
===================================== */

if (bookingFilter) {

    bookingFilter.addEventListener("change", function () {
        displayBookings();
    });

}


/* =====================================
   UPDATE BOOKING STATUS
===================================== */

async function changeBookingStatus(bookingId, status) {

    if (!["confirmed", "rejected"].includes(status)) {
        return;
    }

    const confirmed = confirm(
        "Change this rental enquiry status to " + status + "?"
    );

    if (!confirmed) return;


    try {

        await updateDoc(
            doc(db, "bookings", bookingId),
            {
                status
            }
        );

        await loadBookings();

        alert("Rental enquiry updated.");

    } catch (error) {

        console.error("Booking status error:", error);

        alert("Could not update rental enquiry.");

    }

}


/* =====================================
   DASHBOARD STATISTICS
===================================== */

function updateStatistics() {

    const totalBookings = document.getElementById("totalBookings");

    const pendingBookings = document.getElementById("pendingBookings");

    const activeVehicles = document.getElementById("activeVehicles");


    if (totalBookings) {
        totalBookings.textContent = bookings.length;
    }


    if (pendingBookings) {

        pendingBookings.textContent = bookings.filter(function (booking) {
            return booking.status === "pending";
        }).length;

    }


    if (activeVehicles) {

        activeVehicles.textContent = vehicles.filter(function (vehicle) {
            return vehicle.status === "active";
        }).length;

    }

}
