
/* =========================================
   22 LOGISTICS — MAIN JAVASCRIPT
   Firebase Vehicle Loading & Rental Enquiries
   ========================================= */

import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    query,
    where,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";


// =========================================
// 1. ELEMENTS
// =========================================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

const yearElement = document.getElementById("year");

const vehicleGrid = document.getElementById("vehicleGrid");
const vehicleSelect = document.getElementById("vehicle");

const bookingForm = document.getElementById("bookingForm");

const customerName = document.getElementById("customerName");
const customerPhone = document.getElementById("customerPhone");

const pickupDate = document.getElementById("pickupDate");
const returnDate = document.getElementById("returnDate");

const message = document.getElementById("message");

const submitButton = bookingForm.querySelector(
    'button[type="submit"]'
);

const enquiryResult = document.getElementById("enquiryResult");
const enquiryMessage = document.getElementById("enquiryMessage");

const copyEnquiry = document.getElementById("copyEnquiry");
const resetEnquiry = document.getElementById("resetEnquiry");


// =========================================
// 2. MOBILE NAVIGATION
// =========================================

menuToggle.addEventListener("click", function () {

    navLinks.classList.toggle("active");

    const isOpen = navLinks.classList.contains("active");

    menuToggle.setAttribute("aria-expanded", String(isOpen));

});

navLinks.querySelectorAll("a").forEach(function (link) {

    link.addEventListener("click", function () {

        navLinks.classList.remove("active");

        menuToggle.setAttribute("aria-expanded", "false");

    });

});


// =========================================
// 3. AUTOMATIC FOOTER YEAR
// =========================================

yearElement.textContent = new Date().getFullYear();


// =========================================
// 4. VEHICLE DATA
// =========================================

// Stores active vehicles using their Firestore document IDs.

const availableVehicles = new Map();


// =========================================
// 5. HELPER FUNCTIONS
// =========================================

function getToday() {

    const date = new Date();

    return (
        date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0")
    );

}


function formatDate(dateString) {

    return new Date(dateString + "T00:00:00").toLocaleDateString(
        "en-GB",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


function formatPrice(price, priceUnit) {

    const amount = Number(price);

    if (!Number.isFinite(amount) || amount <= 0) {
        return "Contact for rates";
    }

    const formattedAmount = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(amount);

    const unitLabels = {
        hour: "hour",
        day: "day",
        week: "week",
        month: "month"
    };

    const unit = unitLabels[priceUnit] || priceUnit || "rental";

    return formattedAmount + " / " + unit;

}


function createElement(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;

}


// Only allow normal HTTP and HTTPS image addresses.

function getSafeImageUrl(value) {

    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    try {

        const url = new URL(value);

        if (
            url.protocol === "https:" ||
            url.protocol === "http:"
        ) {
            return url.href;
        }

    } catch (error) {

        return null;

    }

    return null;

}


// =========================================
// 6. VEHICLE SELECT DROPDOWN
// =========================================

function populateVehicleSelect() {

    vehicleSelect.replaceChildren();

    const placeholder = createElement(
        "option",
        "",
        "Choose a vehicle"
    );

    placeholder.value = "";

    vehicleSelect.appendChild(placeholder);


    availableVehicles.forEach(function (vehicle, vehicleId) {

        const option = createElement(
            "option",
            "",
            vehicle.name
        );

        option.value = vehicleId;

        vehicleSelect.appendChild(option);

    });


    const anyOption = createElement(
        "option",
        "",
        "Any available vehicle"
    );

    anyOption.value = "any";

    vehicleSelect.appendChild(anyOption);

}


// =========================================
// 7. VEHICLE CARD DISPLAY
// =========================================

function createVehicleCard(vehicle, vehicleId) {

    const card = createElement("article", "vehicle-card");

    const imageContainer = createElement(
        "div",
        "vehicle-image"
    );

    const imageUrl = getSafeImageUrl(vehicle.imageUrl);

    if (imageUrl) {

        const image = createElement("img");

        image.src = imageUrl;
        image.alt = vehicle.name || "Rental vehicle";
        image.loading = "lazy";

        image.addEventListener("error", function () {

            const placeholder = createElement(
                "div",
                "vehicle-placeholder",
                "Vehicle image unavailable"
            );

            imageContainer.replaceChildren(placeholder);

        });

        imageContainer.appendChild(image);

    } else {

        const placeholder = createElement(
            "div",
            "vehicle-placeholder",
            "Vehicle image coming soon"
        );

        imageContainer.appendChild(placeholder);

    }


    const info = createElement("div", "vehicle-info");

    const category = createElement(
        "span",
        "vehicle-type",
        vehicle.category || "Vehicle"
    );

    const name = createElement(
        "h3",
        "",
        vehicle.name || "Unnamed Vehicle"
    );

    const description = createElement(
        "p",
        "",
        vehicle.description || "Contact our team for vehicle details."
    );

    const price = createElement(
        "h4",
        "",
        formatPrice(vehicle.price, vehicle.priceUnit)
    );

    const enquireButton = createElement(
        "button",
        "vehicle-enquire",
        "Enquire About Vehicle →"
    );

    enquireButton.type = "button";

    enquireButton.addEventListener("click", function () {

        vehicleSelect.value = vehicleId;

        document.getElementById("contact").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    });


    info.appendChild(category);
    info.appendChild(name);
    info.appendChild(description);
    info.appendChild(price);
    info.appendChild(enquireButton);

    card.appendChild(imageContainer);
    card.appendChild(info);

    return card;

}


// =========================================
// 8. LOAD VEHICLES FROM FIRESTORE
// =========================================

async function loadVehicles() {

    vehicleGrid.replaceChildren(
        createElement(
            "p",
            "empty-state",
            "Loading available vehicles..."
        )
    );

    try {

        // Only request active vehicles.
        // This matches the public Firestore read rule.

        const vehiclesQuery = query(
            collection(db, "vehicles"),
            where("status", "==", "active")
        );

        const snapshot = await getDocs(vehiclesQuery);

        availableVehicles.clear();

        vehicleGrid.replaceChildren();


        snapshot.forEach(function (documentSnapshot) {

            const vehicle = documentSnapshot.data();

            const vehicleId = documentSnapshot.id;

            availableVehicles.set(vehicleId, vehicle);

            const card = createVehicleCard(
                vehicle,
                vehicleId
            );

            vehicleGrid.appendChild(card);

        });


        populateVehicleSelect();


        if (snapshot.empty) {

            vehicleGrid.appendChild(
                createElement(
                    "p",
                    "empty-state",
                    "No vehicles are currently listed. You can still submit an enquiry for any available vehicle."
                )
            );

        }

    } catch (error) {

        console.error("Vehicle loading error:", error);

        vehicleGrid.replaceChildren(
            createElement(
                "p",
                "empty-state",
                "We couldn't load the vehicle list. You can still enquire about any available vehicle."
            )
        );

        // Keep the general enquiry option available.

        populateVehicleSelect();

    }

}


// Load vehicles when the page opens.

loadVehicles();


// =========================================
// 9. DATE VALIDATION
// =========================================

function updateDateLimits() {

    const today = getToday();

    pickupDate.min = today;

    returnDate.min = pickupDate.value || today;

}

updateDateLimits();


pickupDate.addEventListener("change", function () {

    updateDateLimits();

    if (
        returnDate.value &&
        returnDate.value < pickupDate.value
    ) {

        returnDate.value = "";

    }

});


// =========================================
// 10. SUBMIT RENTAL ENQUIRY TO FIRESTORE
// =========================================

bookingForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const name = customerName.value.trim();

    const phone = customerPhone.value.trim();

    const vehicleId = vehicleSelect.value;

    const pickup = pickupDate.value;

    const returning = returnDate.value;

    const extraMessage = message.value.trim();


    // Basic validation

    if (
        !name ||
        !phone ||
        !vehicleId ||
        !pickup ||
        !returning
    ) {

        alert("Please complete all required fields.");

        return;

    }


    if (name.length < 2 || name.length > 100) {

        alert("Please enter a valid name.");

        return;

    }


    if (!/^[+0-9()\-\s]{7,20}$/.test(phone)) {

        alert("Please enter a valid phone number.");

        return;

    }


    if (pickup < getToday()) {

        alert("Pickup date cannot be in the past.");

        return;

    }


    if (returning < pickup) {

        alert("Return date cannot be earlier than pickup date.");

        return;

    }


    if (extraMessage.length > 1000) {

        alert("Your additional information is too long.");

        return;

    }


    // Confirm that the selected vehicle is in the
    // active vehicles currently loaded from Firestore.

    if (
        vehicleId !== "any" &&
        !availableVehicles.has(vehicleId)
    ) {

        alert(
            "This vehicle is no longer available in the list. Please refresh the page and try again."
        );

        return;

    }


    // Prepare enquiry details

    const selectedVehicleName =
        vehicleId === "any"
            ? "Any available vehicle"
            : availableVehicles.get(vehicleId).name;


    const formattedPickup = formatDate(pickup);

    const formattedReturn = formatDate(returning);


    submitButton.disabled = true;

    submitButton.textContent = "Submitting Enquiry...";


    try {

        // Save the enquiry to Firestore.

        const bookingRef = await addDoc(
            collection(db, "bookings"),
            {
                customerName: name,

                customerPhone: phone,

                vehicleId: vehicleId,

                pickupDate: pickup,

                returnDate: returning,

                message: extraMessage,

                status: "pending",

                createdAt: serverTimestamp()
            }
        );


        // Generate the customer reference message.

        const enquiry = `
22 LOGISTICS — RENTAL ENQUIRY

Reference: ${bookingRef.id}

Customer Name: ${name}

Phone Number: ${phone}

Vehicle of Interest: ${selectedVehicleName}

Pickup Date: ${formattedPickup}

Return Date: ${formattedReturn}

Additional Information:
${extraMessage || "None"}

--------------------------------

Your rental enquiry has been submitted successfully.

Status: Pending review.

The 22 Logistics team will need to review your request and confirm availability.

Thank you.
        `.trim();


        enquiryMessage.value = enquiry;


        // Display success result.

        bookingForm.hidden = true;

        enquiryResult.hidden = false;

        enquiryResult.querySelector("h4").textContent =
            "Enquiry submitted successfully!";

        enquiryResult.querySelector("p").textContent =
            "Your request has been received. Keep your reference number for future enquiries. Your booking is not confirmed yet.";


        copyEnquiry.hidden = false;

        copyEnquiry.textContent = "Copy Enquiry";

        resetEnquiry.textContent = "Submit Another Enquiry";


        enquiryResult.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });


    } catch (error) {

        console.error("Booking submission error:", error);

        alert(
            "Your enquiry could not be submitted. Please check your internet connection and try again."
        );

    } finally {

        submitButton.disabled = false;

        submitButton.textContent = "Submit Rental Enquiry →";

    }

});


// =========================================
// 11. COPY ENQUIRY
// =========================================

copyEnquiry.addEventListener("click", async function () {

    try {

        await navigator.clipboard.writeText(
            enquiryMessage.value
        );

        copyEnquiry.textContent = "Copied Successfully!";

    } catch (error) {

        enquiryMessage.focus();

        enquiryMessage.select();

        const copied = document.execCommand("copy");

        if (copied) {

            copyEnquiry.textContent = "Copied Successfully!";

        } else {

            alert("Please select and copy the message manually.");

        }

    }

});


// =========================================
// 12. RESET ENQUIRY FORM
// =========================================

resetEnquiry.addEventListener("click", function () {

    bookingForm.reset();

    bookingForm.hidden = false;

    enquiryResult.hidden = true;

    enquiryMessage.value = "";

    copyEnquiry.hidden = false;

    copyEnquiry.textContent = "Copy Enquiry";

    resetEnquiry.textContent = "Submit Another Enquiry";

    updateDateLimits();

    bookingForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

});


// =========================================
// END OF 22 LOGISTICS JAVASCRIPT
// =========================================
