// ==============================
// GET THE ELEMENTS
// ==============================

// Get the hamburger button
const menuButton = document.getElementById("menu-button");

// Get the navigation menu
const siteNav = document.getElementById("site-nav");


// ==============================
// HAMBURGER MENU
// ==============================

// When the hamburger button is clicked
menuButton.addEventListener("click", function () {

    // Show or hide the navigation menu
    siteNav.classList.toggle("show-menu");

});