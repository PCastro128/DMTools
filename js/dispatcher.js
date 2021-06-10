
const PAGE_PATH = "/html/"
const PAGES = ["dice"]

function dispatch_page() {
    get_current_page((page) => {
        window.location = page;
    })
}


function get_current_page(callback) {
    chrome.storage.local.get(["current_page"], (result) => {
        let page = result.current_page;
        console.log(page);
        if (!page) {
            page = PAGES[0];
            set_current_page(page, () => callback(PAGE_PATH + page + ".html"));
        } else {
            callback(PAGE_PATH + page + ".html");
        }
    })
}


function set_current_page(page, callback) {
    if (PAGES.includes(page)) {
        chrome.storage.local.set({current_page: page}, callback);
    }
}


window.onload = dispatch_page;