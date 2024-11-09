document.addEventListener('DOMContentLoaded', function() {
const searchButton = document.getElementById('searching-button');
const searchIcon = document.getElementById('searching-icon');
const searchBox = document.getElementById('search-box');
var changed = false
function aiMode(searching) {
    if (searchBox.value.includes('?')) {
        changed = true
        searchIcon.classList.replace("fa-search", "fa-search-plus");
        for (let i = 0; i < searchContainers.length; i++) {
            searchContainers[i].style.backgroundColor = 'rgb(172, 176, 255)';
            if (searching) {
                searchContainers[i].style.animation = "search-animation 3s ease infinite";
            }
        }
    } else if (changed) {
        for (let i = 0; i < searchContainers.length; i++) {
            searchContainers[i].style.backgroundColor = '';
        }
        searchIcon.classList.replace("fa-search-plus", "fa-search");
        changed = false
    }
}

var searchContainers = document.getElementsByClassName('twitter-typeahead');
const loadingInterval = setInterval(() => {
    searchContainers = document.getElementsByClassName('twitter-typeahead');
    const mobileAnimation = window.innerWidth <= 768 ? true : false;
    if (searchContainers.length > 0) {
        clearInterval(loadingInterval);
        searchBox.addEventListener('input', function(event){
            if (event.inputType === "insertText" && event.data === "\n") {
                aiMode(true);
            }
            aiMode(mobileAnimation);
        });

        searchButton.addEventListener("click", function() {
            aiMode(true);
        });

        searchButton.addEventListener("touchstart", function() {
            aiMode(true);
        });

        searchBox.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                aiMode(true);
            }
        });

        aiMode(false);
    }
}, 100);
});