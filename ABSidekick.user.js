// ==UserScript==

// ----------------------------------- MetaData --------------------------------------

// @name        ABSidekick
// @author      WirlyWirly
// @version     0.7
// @homepage    https://github.com/WirlyWirly/ABSidekick
// @description Your sidekick for the AudioBookShelf web interface
//              Written on LibreWolf via Violentmonkey
//
// @namespace   UserScript
// @run-at      document-end

// ----------------------------------- Matches --------------------------------------

// If ABSidekick does not run automatically, edit this '@match' line so that it has the same IP:PORT that is shown in your browser
// @match       http://192.168.1.105:80/audiobookshelf/*

// @include     /https?://.+/audiobookshelf/.*/

// ----------------------------------- Permissions --------------------------------------

// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_info
// @grant       GM_listValues
// @grant       GM_registerMenuCommand
// @grant       GM_setValue

// ----------------------------------- Dependencies --------------------------------------

// @require     https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js

// ----------------------------------- Script Links --------------------------------------

// @icon        https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/.github/assets/icon.webp?raw=true
// @updateURL   https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/ABSidekick.user.js?raw=true
// @downloadURL https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/ABSidekick.user.js?raw=true

// ==/UserScript==

// =================================== CODE ======================================

// The Audiobookshelf URL that will be used in generating the API url
let absURL = document.URL.match(/^(.+?\/audiobookshelf)\//)[1]

// Initialize the GM_config settings panel and populate the global SETTINGS object
let SETTINGS = settingsPanel()

// Create the GM_config settings panel button in the #appbar
waitForElement('#appbar a[href="/audiobookshelf/config"]', document.body).then(function(absConfigButton) {
    // The ABS config button is now available in the #appbar

    // Generate the 🛠️ button
    let settingsShortcut = document.createElement('div')
    settingsShortcut.id = 'gmConfigAppBar'
    settingsShortcut.innerText = '🛠️'
    settingsShortcut.title = 'Open the ABSidekick settings panel'
    settingsShortcut.addEventListener('click', function() {
        GM_config.open()
    })

    // Insert it after the ABS config button
    absConfigButton.insertAdjacentElement('afterend', settingsShortcut)

})

// The <div> element that will be used to display hover covers
let hoverCoverElement = document.createElement('div')
document.body.appendChild(hoverCoverElement)
hoverCoverElement.outerHTML = `<div id="hoverCoverContainer"><img src="" style="border-radius: 10px; max-height: 100%; max-width: 100%"></div>`

// The functions that will wait for and then initiate injections when there targets are loaded
appContentMain()
editPanelMain()

// =================================== MAINS ======================================

async function appContentMain() {
    // Setup a MutationObserver to monitor the #app-content element for changes, which indicates a new page-type has been loaded and needs to be handled

    let appContent = await waitForElement('#app-content', document.body)

    // Check if the initial page load was already an itemPage
    appContent.querySelector('#item-page-wrapper') ? itemPageInjector(appContent.querySelector('#item-page-wrapper')) : null

    let appContentObserver = new MutationObserver(async function(mutations) {
        // The actions to perform when new mutations are detected to the '#app-content' element

        let itemPage = appContent.querySelector('div > #item-page-wrapper:not(.pageProcessed)')

        if ( itemPage ) {
            // This is a itemPage (book page)

            itemPageInjector(itemPage)
        }

    })

    let target = appContent
    let config = { childList: true }

    appContentObserver.observe(target, config)

}


async function editPanelMain() {
    // Wait for the 'Edit Panel' to be loaded and then proceed with adding functionality

    // Observer the <body> child elements until the <div> of the edit panel [data-v-779b4e02] is loaded
    let modalOverlay = await waitForElement('body > div.modal[data-v-779b4e02]', document.body, false)

    // Verify this modalOverlay contains the Edit Panel by checking that is has the 6 <button> elements that are used to change tabs
    let editPanel = await waitForElement('div.relative:has(div[role="tablist"] > button:last-child:nth-child(6))', modalOverlay)

    // Set identifiers for the edit panel and important elements
    modalOverlay.id = 'modalOverlay'
    modalOverlay.querySelector('div > h1').id = 'bookTitle'

    editPanel.id = 'editPanel'
    editPanel.querySelector('div[role="tablist"]').id = 'editPanelTabs'
    editPanel.querySelector('div.absolute[role="tablist"] button:nth-child(1)').id = 'detailsTab'
    editPanel.querySelector('div.absolute[role="tablist"] button:nth-child(2)').id = 'coverTab'
    editPanel.querySelector('div.absolute[role="tablist"] button:nth-child(3)').id = 'chaptersTab'
    editPanel.querySelector('div.absolute[role="tablist"] button:nth-child(4)').id = 'filesTab'
    editPanel.querySelector('div.absolute[role="tablist"] button:nth-child(5)').id = 'matchTab'
    editPanel.querySelector('div.absolute[role="tablist"] button:nth-child(6)').id = 'toolsTab'

    editPanel.querySelector('button[aria-label="Previous"]').id = 'navigateRight'
    editPanel.querySelector('button[aria-label="Next"]').id = 'navigateLeft'

    // -- MatchTab ---
    let matchTabButton = editPanel.querySelector('#matchTab')
    matchTabButton.innerText = '🌱 Match'
    matchTabButton.addEventListener('click', async function(event) {
        // The match tab of the edit panel was clicked

        await waitForElement('#match-wrapper', editPanel)

        // Check that this match tab does not have a 'Title' button, which indicates that it needs injections
        !editPanel.querySelector('#buttonTitle') ? matchTabInjector() : null

    })


}


// =================================== INJECTORS ======================================


async function itemPageInjector(itemPage) {
    // Inject the current itemPage with custom elements and setup a MutationObserver to monitor for any new match results

    itemPage.classList.add('pageProcessed')

    // Add identifiers to the various elements of interest
    setId(itemPage, '#item-page-wrapper > div > :nth-child(1)', 'coverSection')
    setId(itemPage, '#item-page-wrapper > div > :nth-child(2)', 'metadataSection')

    setId(itemPage, '#coverSection img[src*="/api/items/"]', 'itemCover')

    // - MetaData rows -
    setId(itemPage, '#metadataSection > div.flex > div.mb-4', 'metaTop')
    setId(itemPage, '#metaTop h1', 'itemTitle')
    setId(itemPage, '#metaTop > :nth-child(2)', 'itemSubtitle')
    setId(itemPage, '#metaTop > a[href*="/series/"]', 'itemSeries')
    setId(itemPage, '#metaTop a[href*="/audiobookshelf/author/"]', 'itemAuthor')
    setId(itemPage, '#metaTop > :last-child[data-v-338ea578', 'itemMetaRows')

    // - Buttons above synopsis -
    setId(itemPage, '#metadataSection > div:has(button.abs-btn)', 'buttonsRow')
    setId(itemPage, '#buttonsRow > button.abs-btn', 'itemPlay')

    // - Library files dropdown
    setId(itemPage, '#metadataSection > :last-child', 'libraryFiles')

    // Cover Container
    itemPage.querySelector('#itemCover').parentElement.parentElement.classList.add('itemCover')

    // Background blur
    if ( SETTINGS.itemBackgroundBlur ) {

        let coverURL = itemPage.querySelector('#itemCover').src
        itemPage.parentElement.style.background = `url('${coverURL}') no-repeat center center fixed`
        itemPage.parentElement.style.backgroundSize = 'cover'
        itemPage.classList.add('blurEffect')

    }

    // Meta Glass
    if ( SETTINGS.itemMetaGlass ) {

        // Metadata rows
        itemPage.querySelector('#itemMetaRows').classList.add('itemMetaRows')

    }

    // Progress Glass
    if ( SETTINGS.itemProgressGlass ) {
        if ( itemPage.querySelector('#metadataSection > :nth-child(2)').innerText.match(/Started \d+\/\d+\/\d+/) ) {
            itemPage.querySelector('#metadataSection > :nth-child(2)').classList.add('itemProgress')
        }

    }

    // Buttons Glass
    if ( SETTINGS.itemButtonGlass ) {
        for ( let button of itemPage.querySelectorAll('#buttonsRow button.bg-primary') ) {
            button.classList.add('itemButtonGlass')
        }
    }

    // Summary Glass
    if ( SETTINGS.itemSummaryGlass ) {
        // Description
        itemPage.querySelector('#item-description').parentElement.classList.add('descriptionContainer')

    }

    // Dropdown Glass
    if ( SETTINGS.itemDropdownGlass ) {
        for ( dropdownBar of itemPage.querySelectorAll('#metadataSection div.w-full.bg-primary:has(p)') ) {
            dropdownBar.classList.add('itemDropdown')
        }

    }

    // Hover Cover
    let hoverElement = document.createElement('div')
    hoverElement.innerText = '👀'
    hoverElement.classList.add('hoverCoverToggle')
    hoverElement.addEventListener('mouseenter', function(event) {
        // Display the enlarged item cover
        let { clientX, clientY } = event
        viewHoverCover(`${absURL}/api/items/${itemId}/cover?raw=1`, clientX, clientY)

    })

    hoverElement.addEventListener('mouseout', function(event) {
        // Stop displaying the enlarged result cover
        let hoverCoverElement = document.getElementById('hoverCoverContainer')
        hoverCoverElement.classList.remove('active')
        hoverCoverElement.querySelector('img').src = ''
    })

    itemPage.querySelector('#itemCover').insertAdjacentElement('afterend', hoverElement)

    // Fetch item metadata
    let itemId = document.getElementById('itemCover').src.match(/\/items\/(.+?)\//)[1]
    let metadata = await fetchItemMedata(itemId)

    // The object containing the data used to fill in templates
    let templateVariables = {
        title: metadata.media.metadata.title,
        author: metadata.media.metadata.authors[0].name,
        year: metadata.media.metadata.publishedYear,
        asin: metadata.media.metadata.asin,
    }
    console.log(metadata)
    console.log(templateVariables)

    // Goodreads Button
    let goodreadsButton = document.createElement('button')
    goodreadsButton.innerText = 'Goodreads'
    goodreadsButton.setAttribute('class', 'bg-primary border-gray-600 border rounded-md mx-0.5')
    goodreadsButton.classList.add('itemButton')
    SETTINGS.itemButtonGlass ? goodreadsButton.classList.add('itemButtonGlass') : null
    goodreadsButton.title = 'Search Goodreads for this title'
    goodreadsButton.addEventListener('click', function(event) {
        // Open the Audible page using the available ASIN

        let goodreadsURL = SETTINGS.goodreadsTemplate.replace(/%title%/, encodeURI(templateVariables.title))
        window.open(goodreadsURL, '_blank')

    })

    itemPage.querySelector('#buttonsRow > div:last-child').insertAdjacentElement('beforebegin', goodreadsButton)

    // Audible Button (if this item has a ASIN)
    if ( templateVariables.asin ) {

        let audibleButton = document.createElement('button')
        audibleButton.innerText = 'Audible'
        audibleButton.setAttribute('class', 'bg-primary border-gray-600 border rounded-md mx-0.5')
        audibleButton.classList.add('itemButton')
        SETTINGS.itemButtonGlass ? audibleButton.classList.add('itemButtonGlass') : null
        audibleButton.title = 'Open the Audible page of this item'
        audibleButton.addEventListener('click', function(event) {
            // Open the Audible page using the available ASIN

            let asinURL = SETTINGS.audibleTemplate.replace(/%asin%/, metadata.media.metadata.asin)
            window.open(asinURL, '_blank')

        })

        itemPage.querySelector('#buttonsRow > div:last-child').insertAdjacentElement('beforebegin', audibleButton)

    }

    // Custom Buttons
    for (let i = 1; i <= SETTINGS.customButtonCount; i++) {

        // This custom button has a label, so generate and insert the button element
        if ( SETTINGS[`custom_button_label_${i}`] != '' ) {

            let customButton = document.createElement('button')
            customButton.innerText = SETTINGS[`custom_button_label_${i}`]
            customButton.setAttribute('class', 'bg-primary border-gray-600 border rounded-md mx-0.5')
            customButton.classList.add('itemButton')
            SETTINGS.itemButtonGlass ? customButton.classList.add('itemButtonGlass') : null
            customButton.title = `🌐 ${SETTINGS[`custom_button_label_${i}`]}\n\n🔗 ${SETTINGS[`custom_button_template_${i}`]}`
            customButton.addEventListener('click', function(event) {

                let customURL = SETTINGS[`custom_button_template_${i}`].replace(/%title%/, templateVariables.title)
                templateVariables.author ? customURL = customURL.replace(/%author%/, templateVariables.author) : customURL = customURL.replace(/%author%/, '') 
                templateVariables.year ? customURL = customURL.replace(/%year%/, templateVariables.year) : customURL = customURL.replace(/%year%/, '') 
                templateVariables.asin ? customURL = customURL.replace(/%asin%/, templateVariables.asin) : customURL = customURL.replace(/%asin%/, '') 

                window.open(customURL, '_blank')

            })

            itemPage.querySelector('#buttonsRow > div:last-child').insertAdjacentElement('beforebegin', customButton)

        }
    }

}


async function matchTabInjector() {
    // Inject the MatchTab with custom elements and setup a MutationObserver to monitor for any new match results

    let editPanel = document.querySelector('#editPanel')
    let matchTab = editPanel.querySelector('#match-wrapper')

    // Add identifiers to the various elements of interest
    setId(matchTab, ':nth-child(1)', 'searchForm')
    setId(matchTab, '#searchForm input[placeholder="Search.."]', 'inputTitle')
    matchTab.querySelector('#searchForm input[placeholder="Search.."]').parentElement.previousElementSibling.id = 'labelInputTitle'
    setId(matchTab, '#searchForm input[placeholder="Author"]', 'inputAuthor')
    setId(matchTab, '#searchForm button[type="Submit"]', 'buttonSearch')
    setId(matchTab, 'div.matchListWrapper', 'resultsList')
    //matchTab.querySelector('#searchForm button[aria-label^="Provider"]').id = 'buttonProvider'

    // Create the GM_config settings shortcut
    let settingsShortcut = document.createElement('div')
    matchTab.appendChild(settingsShortcut)
    settingsShortcut.id = 'gmconfigShortcut'
    settingsShortcut.innerText = '🛠️'
    settingsShortcut.title = 'Open the ABSidekick settings panel'
    settingsShortcut.addEventListener('click', function() {
        GM_config.open()
    })

    // Create the 'Title' search button
    let titleSearchButton = document.createElement('button')
    titleSearchButton.id = 'buttonTitle'
    titleSearchButton.innerText = 'Title'
    titleSearchButton.setAttribute('class', 'abs-btn rounded-md shadow-md relative border border-gray-600 mt-5 ml-1 text-white bg-primary px-8 py-2')
    titleSearchButton.title = 'Fill the search field with the current title'
    matchTab.querySelector('form > div').appendChild(titleSearchButton)
    titleSearchButton.addEventListener('mouseup', function(event) {
        // The actions to take when the 'Title' button is clicked
        titleSearch()
    })

    // Create the 'AutoMatch' button
    let autoMatchButton = document.createElement('button')
    matchTab.querySelector('form > div').appendChild(autoMatchButton)
    autoMatchButton.id = 'buttonAutoMatch'
    autoMatchButton.setAttribute('class', 'abs-btn rounded-md shadow-md relative border border-gray-600 mt-5 ml-1 text-white bg-primary px-8 py-2')

    if ( SETTINGS.autoMatchEnabled == false ) {
        autoMatchButton.innerText = `AutoMatch` 
        autoMatchButton.title = `Enable AutoMatch\n\nℹ️ Confidence >=${SETTINGS.autoMatchConfidence}%`
        autoMatchButton.style.animation = '' 

    } else {
        autoMatchButton.innerText = `🤖 AutoMatch`
        autoMatchButton.title = `AutoMatch is enabled\n\nClick or press SPACE to cancel\n\nℹ️ Confidence: >= ${SETTINGS.autoMatchConfidence}`
        autoMatchButton.style.animation = 'pop .50s linear infinite alternate' 
    }

    autoMatchButton.addEventListener('click', function(event) {
        
        // Toggle AutoMatch
        SETTINGS.autoMatchEnabled == false ? autoMatchStart(matchTab.querySelectorAll('#resultsList div.resultProcessed')) : autoMatchStop()

    })

    // When the edit panel is manually cycled, clean the match tab of old info
    editPanel.querySelector('#navigateRight').addEventListener('mouseup', () => { cleanMatchTab() } )
    editPanel.querySelector('#navigateLeft').addEventListener('mouseup', () => { cleanMatchTab() } )

    let observer = new MutationObserver(async function(mutations) {
        // Actions to take when there are changes in the match tab

        // Query for only the newly added match results
        let newMatchResults = matchTab.querySelectorAll('#resultsList > div > div.cursor-pointer:not(.resultProcessed)')

        if ( newMatchResults.length > 0  ) {
            // There are new match results, so process each item

            for ( let result of newMatchResults ) {
                // For each match, generate the new elements (buttons|coverDimensions)

                // Add identifiers to the various elements of intereset in a match result
                result.classList.add('resultProcessed')
                result.parentElement.classList.add('resultContainer')

                result.querySelector(':nth-child(1)').classList.add('resultCover')
                result.querySelector('.resultCover img').classList.add('resultCoverImg')

                result.querySelector(':nth-child(2)').classList.add('resultMeta')
                result.querySelector('.resultMeta > :nth-child(1)').classList.add('resultTitle')
                result.querySelector('.resultMeta > :nth-child(2)').classList.add('resultDetails')
                try{ result.querySelector('.resultDetails div.rounded-full').classList.add('resultConfidence') } catch(error) {}
                try{ result.querySelector('.resultMeta > div:has( > div.rounded-full > p)').classList.add('resultSeries') } catch(error) {}
                result.querySelector('.resultMeta > div.overflow-hidden:has(> p)').classList.add('resultSynopsis')

                setTimeout(() => {

                    // After the images have a chance to load, create the Cover Dimensions label
                    let matchCover = result.querySelector('.resultCoverImg')
                    let dimensionsElement = document.createElement('div')
                    dimensionsElement.classList.add('resultCoverDimensions')
                    dimensionsElement.innerText = `${matchCover.naturalWidth} x ${matchCover.naturalHeight}`
                    matchCover.parentElement.insertAdjacentElement('afterend', dimensionsElement)

                    dimensionsElement.addEventListener('mouseenter', function(event) {
                        // Display the enlarged result cover
                        let { clientX, clientY } = event
                        viewHoverCover(this.parentElement.querySelector('.resultCoverImg').src, clientX, clientY)
                    })

                    dimensionsElement.addEventListener('mouseout', function(event) {
                        // Stop displaying the enlarged result cover
                        let hoverCoverElement = document.getElementById('hoverCoverContainer')
                        hoverCoverElement.classList.remove('active')
                    })

                }, 500)

                // The element that will contain the ABSidekick buttons
                let buttonHolder = document.createElement('div')
                buttonHolder.classList.add('scriptButtons')

                // Save + Tag Button
                let saveTagButton = document.createElement('button')
                saveTagButton.innerText = `Save + 🏷️`
                saveTagButton.title = `Save this match result, add the custom tags, then continue to the next book\n\n🏷️ Tags: ${SETTINGS.saveTagsList}`
                saveTagButton.classList.add('saveResultTags', 'resultButton')
                saveTagButton.addEventListener('click', function(event) {

                    if ( SETTINGS.apiKey == '' ) {
                        window.alert('❌ ABSidekick ❌\n\nThis button requires a valid ApiKey\n\nProvide an ApiKey in the settings panel then try again')
                    } else {
                        observer.disconnect()
                        saveResult(this, SETTINGS.saveTagsList)
                    }

                })

                // Save Button
                let saveResultButton = document.createElement('button')
                saveResultButton.innerText = 'Save Match'
                saveResultButton.title = "Save this match result then continue to the next book\n\nℹ️ This is the same as clicking the 'Submit' button of the match result"
                saveResultButton.classList.add('saveResult', 'resultButton')
                saveResultButton.addEventListener('click', function(event) {
                    event.button == 0 ? saveResult(this) : null
                    observer.disconnect()
                })

                // Audible Button
                let asinButton = document.createElement('button')
                asinButton.innerText = 'Audible'
                asinButton.title = 'Open the Audible page of this match result\n\nℹ️ Only works if the match result has an ASIN'
                asinButton.classList.add('asinSearch', 'resultButton')
                asinButton.addEventListener('mouseup', function(event) {
                    event.button == 0 ? audibleLookup(this) : null
                })

                buttonHolder.appendChild(saveResultButton)
                buttonHolder.appendChild(saveTagButton)
                buttonHolder.appendChild(asinButton)

                result.parentElement.appendChild(buttonHolder)

            }

            // --- Use the first match result to get the currentId ---
            newMatchResults[0].click()

            // Wait until the submit button is available, indicating the form details are ready
            let submitButton = await waitForElement('button.bg-success[type="submit"]', matchTab)
            let coverURL = matchTab.querySelector('form img[src*="/api/items/"]').src
            SETTINGS.currentId = coverURL.match(/\/items\/(.+?)\//)[1]

            // Click the back arrow to return to match results
            let backArrowElement = matchTab.querySelector('div.cursor-pointer:has(> span.material-symbols')
            backArrowElement.click()

            // There is not a current cover image, so create one
            if ( !matchTab.querySelector('img.currentCover') ) {
                addBookData(SETTINGS.currentId)
            }

            // Start AutoMatch if enabled and this is not the same item as was previously saved
            if ( SETTINGS.autoMatchEnabled == true && SETTINGS.previousId != SETTINGS.currentId ) {
                autoMatchStart(newMatchResults, observer)
            }

        } else if ( matchTab.querySelector('#match-wrapper > :nth-child(3)').style.display != 'none' ) {
            // The 'No Results' notice is visible, which indicates that the search returned no match results

            // Update the 'No results' message
            matchTab.querySelector('#match-wrapper > :nth-Child(3) > p').outerHTML = `<p class="noResults">Oh 💩, no results! 😭</p>`

            let resultsList = document.getElementById('resultsList')
            let searchQuery = matchTab.querySelector('#inputTitle').value
            let bookTitle = document.getElementById('bookTitle').innerText


            // Make sure a title search has not already been readied, that there are 0 match results, and that the search term is not already the title
            if ( resultsList && !resultsList.classList.contains('titleSearchReady') && resultsList.childElementCount == 0 && searchQuery != bookTitle ) {

                // The title was not used to perform the search, so prepare a title search
                titleSearch()

                if ( SETTINGS.currentId && !matchTab.querySelector('img.currentCover') ) {
                    // There is a currentId available and there is not already a current cover
                    addBookData(SETTINGS.currentId)
                }
            }

        }

    })

    // Monitor the 'style=' property of #resultsList (.matchListWrapper), which changes between searches\navigations
    let target = matchTab.querySelector('#resultsList')
    let config = { childList: true , attributeFilter: ['style'] }
    observer.observe(target, config)

}


// =================================== HELPERS ======================================


function waitForElement(cssTarget, observeTarget = document.body, observeSubTree = true) {
    // Wait until the cssTarget exists within the observeTarget and then resolve the promise
    // Source: https://stackoverflow.com/a/61511955

    return new Promise( function(resolve) {

        if ( observeTarget.querySelector(cssTarget) ) {
            // The cssTarget already exists within the observeTarget, so immediately resolve the promise
            return resolve(observeTarget.querySelector(cssTarget))
        }

        const observer = new MutationObserver( mutations => {
            // The actions to take when there are new mutations to the observeTarget

            if ( observeTarget.querySelector(cssTarget) ) {
                // The cssTarget has been found within the observeTarget
                observer.disconnect()
                resolve(observeTarget.querySelector(cssTarget))
            }
        })

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        try {
            observer.observe(observeTarget, { childList: true, subtree: observeSubTree })
        } catch (error) {
            // console.log(error)
        }

    })

}


function setId(baseElement, targetSelector, idValue) {
    // Check the baseElement for the targetSelector and if it exists set the idValue

    baseElement.querySelector(targetSelector) ? baseElement.querySelector(targetSelector).id = idValue : null

}


async function fetchItemMedata(itemId) {
    // Use the provided itemId to GET the metadata from the api

    let response = await fetch(`${absURL}/api/items/${itemId}`, {
        headers: { 'Authorization': `Bearer ${SETTINGS.apiKey}` }
    })

    let metadata = await response.json()

    return metadata

}


function addBookData(itemId) {
    // Add metadata of the provided book to the Match tab

    // The cover image
    let currentCoverElement = document.createElement('div')
    document.querySelector('#searchForm > div').firstChild.insertAdjacentElement('beforebegin', currentCoverElement)

    currentCoverElement.title = 'The current cover for this book'
    currentCoverElement.classList.add('currentCover')
    currentCoverElement.innerHTML = `<img class="currentCover" src="${absURL}/api/items/${itemId}/cover?&raw=1">`

    currentCoverElement.addEventListener('mouseenter', function(event) {
        let { clientX, clientY } = event
        viewHoverCover(this.parentElement.querySelector('img').src, clientX, clientY)
    })

    currentCoverElement.addEventListener('mouseout', function(event) {
        let hoverCoverElement = document.getElementById('hoverCoverContainer')
        hoverCoverElement.classList.remove('active')
    })

}


function cleanMatchTab() {
    // Clean the match tab of book-specific changes

    let matchTab = document.getElementById('match-wrapper')

    SETTINGS.previousId = SETTINGS.currentId
    SETTINGS.currentId = ''

    if ( matchTab ) {
        // Remove a previous cover image if present
        matchTab.querySelectorAll('div.currentCover').forEach((element) => { element.remove() })

        // Remove 'Title' search styling and indicators
        let labelTitle = matchTab.querySelector('#labelInputTitle')
        if ( labelTitle.classList.contains('titleSearchReady') ) {
            labelTitle.innerText = 'Search Title or ASIN'
            labelTitle.classList.remove('titleSearchReady')
            matchTab.querySelector('#resultsList').classList.remove('titleSearchReady')
        }

    }

}


async function titleSearch() {
    // The 'Title' search button of the match tab was clicked or there were no results during the search

    // The <h1> element at the top of the screen, which displays the title of the current book
    let bookTitle = document.getElementById('bookTitle').innerText

    // Update the search field of the Match tab and click the search button
    let matchTab = document.getElementById('match-wrapper')
    let titleField = matchTab.querySelector('#inputTitle')
    titleField.value = bookTitle

    // Update the Search field label
    matchTab.querySelector('#labelInputTitle').innerText = '📖 No Results? Try a title search! Just add a space then hit Search!'
    matchTab.querySelector('#labelInputTitle').classList.add('titleSearchReady')

    // Add a class to indicate that a title search has already been readied
    matchTab.querySelector('#resultsList').classList.add('titleSearchReady')

    // -- NOT WORKING --
    matchTab.querySelector('#buttonSearch').click()

}


function autoMatchStart(matchResults, mutationObserver = false) {
    // Enable and then AutoMatch for a match entry among the provided array

    // AutoMatch has not yet been enabled, so make the changes necessary to cancel it
    if ( SETTINGS.autoMatchEnabled == false ) {
        
        SETTINGS.autoMatchEnabled = true 

        // MatchTab button
        let autoMatchButton = document.getElementById('buttonAutoMatch')
        autoMatchButton.innerText = `🤖 AutoMatch`
        autoMatchButton.title = `AutoMatch is enabled\n\nClick or press SPACE to cancel\n\nℹ️ Confidence: >= ${SETTINGS.autoMatchConfidence}`
        autoMatchButton.style.animation = 'pop .50s linear infinite alternate'

        // Floating button
        let autoMatchCancel = document.createElement('button')
        document.body.appendChild(autoMatchCancel)
        autoMatchCancel.outerHTML = `<button id="autoMatchCancel" title="AutoMatch is enabled\n\nClick or SPACE to cancel\n\nℹ️ Confidence: >= ${SETTINGS.autoMatchConfidence}" class="autoMatchCancel bg-primary rounded-md text-white">🤖 AutoMatch</button>`
        autoMatchCancel = document.getElementById('autoMatchCancel')
        autoMatchCancel.addEventListener('click', function(event) { autoMatchStop() })

        // Global "SPACE" Automatch cancel
        window.addEventListener('keydown', autoMatchSpaceStop)
    }


    // Check for a AutoMatch among the provided matchResults
    for ( let result of matchResults ) {

        // The element containing the confidence percentile
        let confidenceElement = result.querySelector('div.resultConfidence')

        // The confidence element was found
        if ( confidenceElement ) {

            let confidenceScore = confidenceElement.innerText.match(/(\d+)%/)[1]

            if ( confidenceScore >= SETTINGS.autoMatchConfidence ) {
                // This match result has met or exceeded the confidence threshold, so prepare to save it
                result.parentElement.classList.add('autoMatchSelection')

                // Wait the specified number of milliseconds before proceeding
                setTimeout(() => {

                    if ( SETTINGS.autoMatchEnabled == true ) {
                        // AutoMatch was not disabled\canceled, so continue with the save

                        try{ 
                            
                            // Try\Catch, just in case the user left the MatchTab
                            mutationObserver ? mutationObserver.disconnect() : null
                            let targetButton = SETTINGS.autoMatchTarget == 'Save Match' ? 'saveResult' : 'saveResultTags'
                            result.parentElement.querySelector(`button.${targetButton}`).click()

                        } catch(error) {} 
                    }

                }, SETTINGS.autoMatchDelay)

                break

            }

        }

    }

}


function autoMatchSpaceStop(event) {
    // The window event to cancel AutoMatch when SPACE is pressed, specified globally so that the event can be added\removed within other functions
    event.key == ' ' ? autoMatchStop() : null

}


function autoMatchStop() {
    // Stop AutoMatch and revert elements to their default status
    
    SETTINGS.autoMatchEnabled = false

    try {
        
        // Try\catch, just in case the user left the MatchTab
        
        // Floating button
        document.getElementById('autoMatchCancel') ? document.getElementById('autoMatchCancel').remove() : null

        // Window "Space" eventListener
        window.removeEventListener('keydown', autoMatchSpaceStop)

        // MatchTab button
        let autoMatchButton = document.querySelector('#buttonAutoMatch')
        autoMatchButton.innerText = `AutoMatch`
        autoMatchButton.title = `Toggle AutoMatch\n\nℹ️ Confidence: >=${SETTINGS.autoMatchConfidence}%`
        autoMatchButton.style.animation = ''

    } catch(error) {
        console.log(error)
    }

}


function viewHoverCover(imgURL, clientX, clientY) {
    // Using the provided arguments, display the hover cover relative to the cursor location

    let hoverCoverElement = document.getElementById('hoverCoverContainer')
    hoverCoverElement.querySelector('img').src = imgURL
    hoverCoverElement.classList.add('active')

    let positionY =
      clientY + hoverCoverElement.scrollHeight >= window.innerHeight
        ? window.innerHeight - hoverCoverElement.scrollHeight - 20
        : clientY + 20;
    let positionX =
      clientX + hoverCoverElement.scrollWidth >= window.innerWidth
        ? window.innerWidth - hoverCoverElement.scrollWidth - 20
        : clientX + 20;

    hoverCoverElement.style.top = `${positionY}px`
    hoverCoverElement.style.left = `${positionX}px`

}


// @saveResult
async function saveResult(matchButton, additionalTags = false) {
    // A 'Save' button in the MatchTab was clicked

    // The floating Edit panel
    let editPanel = document.getElementById('editPanel')

    // Click the book item, which will load the new data
    matchButton.closest('div.resultContainer').querySelector('div.resultProcessed').click()

    // If the editPanel or matchButton was not found (because the user navigated away during the AutoMatch delay), then cancel the save
    if ( !editPanel || !matchButton) { return }

    // Wait until the submit button is available, then click it
    let submitButton = await waitForElement('button.bg-success[type="submit"]', editPanel.querySelector('#match-wrapper'))

    // From the current cover, get the id of the book that is about to be saved
    let coverURL = editPanel.querySelector('img[src*="/api/items/"]').src
    SETTINGS.previousId = coverURL.match(/\/items\/(.+?)\//)[1]

    // Click the green 'Submit' button to update this book with the metadata of the selected match result
    submitButton.click()

    // Wait until the details tab is ready, indicating the match has been saved
    await waitForElement('#formWrapper', editPanel)

    // API: Additional tag(s)
    if ( additionalTags ) {

        // GET the newly saved tags
        let metadata = await fetchItemMedata(SETTINGS.previousId)
        let currentTags = metadata.media.tags

        // PATCH the new + custom tags
        fetch(`${absURL}/api/items/${SETTINGS.previousId}/media`, {
            method: 'PATCH',
            body: JSON.stringify({ tags: currentTags.concat(additionalTags) }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SETTINGS.apiKey}`
            },
        })

    }

    if ( SETTINGS.navigationDirection != 'None' ) {
        // If enabled, cycle the match tab to the previous\next book

        let titleHeader = document.querySelector('#bookTitle').childNodes[0]

        let titleObserver = new MutationObserver(async function(mutations) {

            // The <h1> title has changed, indicating that the next book has been cycled
            if ( mutations[0].oldValue != mutations[0].target.nodeValue ) {
                titleObserver.disconnect()

                // Get the id of the newly loaded book
                editPanel.querySelector('#coverTab').click()
                let coverURL = await waitForElement('img[src*="/api/items/"]', editPanel)
                SETTINGS.currentId = coverURL.src.match(/\/items\/(.+?)\//)[1]

                // Click on the Match tab, which has a 'click' event listener that will begin observation
                editPanel.querySelector('#matchTab').click()

            }

        })

        titleObserver.observe(titleHeader, { characterData: true, characterDataOldValue: true })

        SETTINGS.navigationDirection == 'Right' ? editPanel.querySelector('#navigateRight').click() : null
        SETTINGS.navigationDirection == 'Left' ? editPanel.querySelector('#navigateLeft').click() : null

    }

}


async function audibleLookup(asinButton) {
    // The 'Audible' lookup button of the MatchTab was clicked

    // The floating Edit panel
    let editPanel = document.getElementById('editPanel')

    // Click the book item, which will load the form data
    asinButton.closest('div.resultContainer').querySelector('div.resultProcessed').click()

    // Wait until the submit button is available, indicating the form is available, then get the ASIN
    let submitButton = await waitForElement('button.bg-success[type="submit"]', editPanel.querySelector('#match-wrapper'))

    let asinURL
    try {
        let asinValue = editPanel.querySelector('#match-wrapper input[placeholder="ASIN"]').value
        asinURL = SETTINGS.audibleTemplate.replace(/%asin%/, asinValue)
    } catch(error) {}

    // Click the back arrow to return to match results
    let backArrowElement = editPanel.querySelector('div.cursor-pointer:has(> span.material-symbols')
    backArrowElement.click()

    asinURL ? window.open(asinURL, '_blank') : asinButton.innerText = 'No ASIN'

}


// =================================== GM_CONFIG ======================================

function settingsPanel() {
    // Generate and initialize the GM_config settings panel. It has been done in this function for code cleanliness.
    
    // Determine the saved number of custom search buttons that should be generated in the settings panel
    let buttonCount
    if ( GM_getValue('abSidekick') !== undefined ) {
        // Parse the existing GM_config() settings object
        let gmcSettingsObject = JSON.parse(GM_getValue('abSidekick'))

        // Get the previously specified buttonCount to determine how many custom button rows should be generated
        buttonCount = gmcSettingsObject['customButtonCount']

    }

    // New installs will not have a customButtonCount, so default to 1
    buttonCount == undefined ? buttonCount = 1 : null


    // Generate the appropriate number of custom button fields
    let gmcButtonFields = {}
    for (let i = 1; i <= buttonCount; i++) {
        // --- GM_config() Fields ---

        let currentLoopFields = {
            [`custom_button_label_${i}`]: {
                'type': 'text'
            },
            [`custom_button_template_${i}`]: {
                'type': 'text'
            }
        }

        gmcButtonFields = {...gmcButtonFields, ...currentLoopFields}

    }

    // The element that will containt the GM_config panel, so that it is not a floating iFrame and can be inspected
    let configFrame = document.createElement('div')
    document.body.appendChild(configFrame)

    let reloadWindow
    // @GM_config
    GM_config.init({
        'id': 'abSidekick',
        'frame': configFrame,
        'title': `
            <a id="absidekickHeader" href="${GM_info.script.homepage}" target="_blank">🌱 ABSidekick</a><br>
            <div>★ Hover over emojis for details ★</div>
        `,

        'fields': {...{

            'autoMatchConfidence': {
                'label': '🤖 AutoMatch Confidence',
                'type': 'int',
                'default': '100',
                'title': 'When AutoMatch is enabled, the first match result with AT-LEAST this confidence score will be the one that is selected and then saved'
            },

            'autoMatchDelay': {
                'label': '🕓 AutoMatch Save Delay',
                'type': 'int',
                'default': '2500',
                'title': 'The delay in milliseconds between when AutoMatch selects a match result and when the save button is clicked\n\nℹ️ A longer delay will give you more time to verify the match and intervene if desired'
            },

            'autoMatchTarget': {
                'label': '🎯 AutoMatch Target',
                'type': 'select',
                'options': ['Save Match', 'Save + 🏷️'],
                'default': 'Save Match',
                'title': 'When AutoMatch has selected a match result to save, this is the button that will be clicked to perform the save'
            },

            'matchTabColumns': {
                'label': '🧇 Grid Columns',
                'type': 'int',
                'default': '2',
                'title': 'The number of grid columns that will be used to display the match results'
            },

            'currentCoverHeight': {
                'label': '🖼️ Current Cover Height',
                'type': 'text',
                'default': '75px',
                'title': 'The maximum height of the current cover that is displayed above the match results'
            },

            'matchCoverHeight': {
                'label': '🖼️ Match Cover Height',
                'type': 'text',
                'default': '192px',
                'title': 'The maximum height of the cover displayed by each match result'
            },

            'matchTabWidth': {
                'label': '↔️ Panel Width',
                'type': 'text',
                'default': '1200px',
                'title': 'The width of the Edit Panel when the Match tab is active'
            },

            'matchTabHeight': {
                'label': '↕️ Panel Height',
                'type': 'text',
                'default': '80%',
                'title': 'The height of the Edit Panel when the Match tab is active'
            },

            'navigationDirection': {
                'label': '🧭 Navigation Direction',
                'type': 'select',
                'options': ['Right', 'Left', 'None'],
                'default': 'Right',
                'title': 'The directional button (arrow) that will be clicked after a match result is saved'
            },

            'saveTagsList': {
                'label': '🏷️ SaveTags List',
                'type': 'text',
                'default': '',
                'title': "A comma seperated list of tags that will be applied to the book when clicking the 'Save + 🏷️' button\n\nℹ️ Setting a unique tag is a simple way to distinguish books that have already been matched, either for simple record keeping or for future scripting"
            },

            'itemBackgroundBlur': {
                'label': '👓 Background Blur',
                'type': 'checkbox',
                'default': true,
                'title': 'Use the cover image to provide a blurred background affect'
            },

            'itemMetaGlass': {
                'label': '🪟 Meta Glass',
                'type': 'checkbox',
                'default': false,
                'title': 'Apply a black glass effect to the metadata rows'
            },

            'itemProgressGlass': {
                'label': '🪟 Progress Glass',
                'type': 'checkbox',
                'default': true,
                'title': 'Apply a black glass effect to the progress indicator'
            },

            'itemButtonGlass': {
                'label': '🪟 Button Glass',
                'type': 'checkbox',
                'default': true,
                'title': 'Apply a black glass effect to the buttons'
            },

            'itemSummaryGlass': {
                'label': '🪟 Summary Glass',
                'type': 'checkbox',
                'default': true,
                'title': 'Apply a black glass effect to the summary text'
            },

            'itemDropdownGlass': {
                'label': '🪟 Dropdown Glass',
                'type': 'checkbox',
                'default': true,
                'title': 'Apply a black glass effect to the dropdown tables'
            },

            'customButtonCount': {
                'label': '🌐 Custom Buttons',
                'type': 'int',
                'default': 2,
                'title': `The number of custom button rows that will be generated\n\nThe 'Button Name' is what will be displayed in Audiobookshelf, while the 'Search Template' is the URL that will be opened in a new tab\n\nℹ️ Search Template Variables...\n\n%title% %author% %year% %asin%`
            },

            'customFontToggle': {
                'label': '✏️ Roboto Condensed',
                'type': 'select',
                'options': ['Everywhere', 'Edit Panel', 'Off'],
                'default': 'Everywhere',
                'title': 'Set Roboto Condensed as the default font'
            },

            'hoverCoverHeight': {
                'label': '🖼️ Hover Cover Height',
                'type': 'text',
                'default': '500px',
                'title': 'The maximum height of a cover image when it is hovered over and enlarged'
            },

            'apiKey': {
                'label': '🔑 ApiKey',
                'type': 'text',
                'default': '',
                'title': 'A valid AudioBookShelf ApiKey'
            },

            'audibleTemplate': {
                'label': '🔎 Audible Template',
                'type': 'text',
                'default': 'https://www.audible.com/pd/%asin%',
                'title': "The search template URL that will be used when clicking a 'Audible' button\n\nℹ️ The %asin% placeholder will be replaced with the actual ASIN of the relevent item"
            },

            'goodreadsTemplate': {
                'label': '🔎 Goodreads Template',
                'type': 'text',
                'default': 'https://www.goodreads.com/search?q=%title%',
                'title': "The search template URL that will be used when clicking a 'Goodreads' button\n\nℹ️ The %title% placeholder will be replaced with the actual title of the relevant item"
            },

        }, ...gmcButtonFields },
        'events': {
            'open': function() {
                let gmcPanel = document.querySelector('#abSidekick')
                reloadWindow = false

                // Create Section Headers
                function settingsHeader(text, beforeElement, titleText = '') {
                    let element = document.createElement('div')
                    element.innerText = text
                    element.classList.add('settingsHeaderRow')
                    element.title = titleText
                    beforeElement.insertAdjacentElement('beforebegin', element)
                }

                settingsHeader('Match Tab', document.querySelector('#abSidekick_autoMatchConfidence_var'), 'These settings apply to features of the Match Tab')
                settingsHeader('Item Pages', document.querySelector('#abSidekick_itemBackgroundBlur_var'), 'These settings apply to item (book) pages')
                settingsHeader('Globals', document.querySelector('#abSidekick_customFontToggle_var'), 'These settings apply to all ABSidekick features and possibly throughout the Audiobookshelf interface')

                // Obfuscate apiKey input
                let apiKeyElement = document.getElementById('abSidekick_field_apiKey')
                apiKeyElement.placeholder = 'abc123'
                apiKeyElement.type = 'password'
                apiKeyElement.addEventListener('focus', function() { this.type = 'text' })
                apiKeyElement.addEventListener('blur', function() { this.type = 'password' })

                // Save Tags placeholder
                document.getElementById('abSidekick_field_saveTagsList').placeholder = 'ABSidekick, Matched'

                // Make sure the Custom Button fields are in the same row
                let insertBeforeElement = gmcPanel.querySelector('#abSidekick_customButtonCount_var').nextElementSibling
                for (let i = 1; i <= buttonCount; i++) {

                    let buttonLabel = gmcPanel.querySelector(`#abSidekick_field_custom_button_label_${i}`)
                    buttonLabel.classList.add('customButtonLabel')

                    let buttonTemplate = gmcPanel.querySelector(`#abSidekick_field_custom_button_template_${i}`)
                    buttonTemplate.classList.add('customButtonTemplate')

                    let labelParent = buttonLabel.parentElement
                    let templateParent = buttonTemplate.parentElement

                    let rowDiv = document.createElement('div')
                    rowDiv.classList.add('customButtonContainer')

                    insertBeforeElement.insertAdjacentElement('beforebegin', rowDiv)

                    rowDiv.appendChild(buttonLabel)
                    rowDiv.appendChild(buttonTemplate)

                    labelParent.remove()
                    templateParent.remove()

                    buttonLabel.placeholder = 'Button Name'
                    buttonTemplate.placeholder = 'Search Template'

                }
                
            },
            'save': function () {
                // Actions to take when the 'Save' button is clicked
                document.getElementById('abSidekick_saveBtn').innerText = '👍 Saved!'
                reloadWindow = true

                // Clear cached data when settings are saved
                GM_listValues().forEach(key => {
                    if (key !== 'abSidekick') {
                        GM_setValue(key, null)
                    }
                })

            },
            'close': function () {
                // Actions to take when the 'Close' button is clicked
                if (reloadWindow) {
                    if (this.frame) {
                        window.location.reload()
                    } else {
                        setTimeout(() => {
                            window.location.reload()
                        }, 250)
                    }
                }
            },
            'reset': function () {
                // Actions to take when the 'Reset' button is clicked
                if (typeof resetToDefaults === 'function') {
                    resetToDefaults()
                }
            }
        }
    })

    // Register the settings panel to be opened from the UserScript manager dialouge
    GM_registerMenuCommand('🛠️ Settings', () => {
        GM_config.open()
    })

    // @SETTINGS
    // Get the saved GM_config settings
    let SETTINGS = {
        currentId: '',
        previousId: '',
        autoMatchEnabled: false,
        metadata: {
            asin: '',
            author: '',
            isbn: '',
            narrator: '',
            publisher: '',
            subtitle: '',
            title: '',
            year: '',
        },

        // Match Tab
        autoMatchConfidence: GM_config.get('autoMatchConfidence'),
        autoMatchDelay: GM_config.get('autoMatchDelay'),
        autoMatchTarget: GM_config.get('autoMatchTarget'),

        currentCoverHeight: GM_config.get('currentCoverHeight'),
        matchCoverHeight: GM_config.get('matchCoverHeight'),
        hoverCoverHeight: GM_config.get('hoverCoverHeight'),

        matchTabColumns: GM_config.get('matchTabColumns'),
        matchTabHeight: GM_config.get('matchTabHeight'),
        matchTabWidth: GM_config.get('matchTabWidth'),

        // Item Pages
        itemBackgroundBlur: GM_config.get('itemBackgroundBlur'),
        itemMetaGlass: GM_config.get('itemMetaGlass'),
        itemProgressGlass: GM_config.get('itemProgressGlass'),
        itemButtonGlass: GM_config.get('itemButtonGlass'),
        itemSummaryGlass: GM_config.get('itemSummaryGlass'),
        itemDropdownGlass: GM_config.get('itemDropdownGlass'),
        customButtonCount: GM_config.get('customButtonCount'),


        // Globals
        navigationDirection: GM_config.get('navigationDirection'),
        customFontToggle: GM_config.get('customFontToggle'),
        saveTagsList: GM_config.get('saveTagsList').split(','),
        apiKey: GM_config.get('apiKey'),
        audibleTemplate: GM_config.get('audibleTemplate'),
        goodreadsTemplate: GM_config.get('goodreadsTemplate'),

    }

    // Custom Buttons
    for (let i = 1; i <= buttonCount; i++) {

        SETTINGS[`custom_button_label_${i}`] = GM_config.get(`custom_button_label_${i}`)
        SETTINGS[`custom_button_template_${i}`] = GM_config.get(`custom_button_template_${i}`)

    }

    return SETTINGS

}


// Settings panel styling
GM_addStyle(`

    #abSidekick * {
        font-family: var(--fonts-roboto) !important;
    }

    #abSidekick {
        backdrop-filter: blur(9px) !important;
        background: #191d2aa3 !important;
        border-radius: 10px !important;
        border: 2px solid #2C3E50 !important;
        box-shadow: 0px 0px 15px #2C3E50 !important;
        color: #ffffff !important;
        height: auto !important;
        inset: 15px 30px auto auto !important;
        line-height: 22px !important;
        margin: 0 !important;
        overflow: auto scroll !important;
        padding: 0px 0px !important;
        position: fixed !important;
        width: 375px !important;
        scrollbar-width: none;
    }

    div#abSidekick_header {
        margin: 20px 0px 10px 0px !important;
    }

    #abSidekick_header > a {
        text-decoration: none;
        user-select: none;
        text-shadow: 0 0 20px #2078b9;
        font-size: 2rem;
        font-family: var(--fonts-lilita) !important;
        animation: textglow .5s linear infinite alternate;
    }

    #abSidekick_header > div {
        color: #95a5a6;
        display: block;
        font-size: .9rem;
        margin: 10px 0px 0px 0px;

    }

    #abSidekick div.settingsHeaderRow {
        border-bottom: 2px solid #2C3E50;
        border-top: 2px solid #2C3E50;
        cursor: default;
        display: flex;
        font-family: var(--fonts-lilita) !important;
        font-size: 1.2rem;
        justify-content: center;
        margin: 12px auto 8px auto;
        text-shadow: 0px 0px 10px #2078b9;
        padding: 5px;
    }

    #abSidekick div.config_var {
        margin: 0px 0px 10px 20px;
    }

    #abSidekick label.field_label {
        color: rgba(255, 255, 255, 0.9);
        font-size: 1rem;
        font-weight: 500;
        margin: unset;

    }
    #abSidekick input[type="text"], #abSidekick input[type="password"], #abSidekick input[type="checkbox"], #abSidekick select {
        /* Text Fields */
        background: rgba(255, 255, 255, 0.9);
        border-radius: 3px;
        border: 1px solid #ddd;
        color: #191d2a;
        font-size: .9rem;
        font-weight: 500;
        margin: unset;
        position: fixed;
        right: 20px;
        text-align: center;
        transition: all 0.3s ease;
        width: 100px;
    }

    #abSidekick #abSidekick_field_saveTagsList,
    #abSidekick #abSidekick_field_apiKey,
    #abSidekick #abSidekick_field_audibleTemplate,
    #abSidekick #abSidekick_field_goodreadsTemplate {
        /* Long Text Fields */
        width: 155px;
    }

    #abSidekick input[type="checkbox"] {
        height: 1rem;
    }

    div.customButtonContainer {
        display: grid;
        grid-template-columns: auto auto;
        gap: 20px;
        margin: 0px 0px 10px 0px;
        padding: 0px 20px 0px 20px;


    }

    #abSidekick div.customButtonContainer input[type="text"] {
        position: unset;
        margin: unset;
    }

    #abSidekick input.customButtonLabel {
        width: 100px;
    }

    #abSidekick input.customButtonTemplate {
        width: 215px;
    }

    #abSidekick select {
        padding: 4px;
    }

    #abSidekick_buttons_holder {
        margin: 12px auto auto auto;
        border-top: 2px solid #2C3E50;
        display: grid;
        padding: 10px 0px 0px 0px;
    }

    button.saveclose_buttons {
        background-color: #2C3E50;
        border-radius: 5px;
        border: none;
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
        color: #FFFFFF;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        margin: 15px auto 0px auto !important;
        padding: 2px 12px !important;
        width: 50%;
    }

    button.saveclose_buttons:hover {
        background-color: #3a4a5b;
        animation: pop .50s linear infinite alternate;
    }

    #abSidekick div.reset_holder {
        margin: 10px 20px 20px 0px;
    }

    #abSidekick a.reset {
        color: #95a5a6;
    }

    #abSidekick a.reset:hover {
        animation: blinker 1s linear infinite;
    }
`)


// =================================== CSS Styling ======================================

// Global styling
GM_addStyle(`

@import url('https://fonts.googleapis.com/css2?family=Lilita+One&family=Roboto+Condensed:wght@500&display=swap');

    :root {
        --fonts-lilita: 'Lilita One', 'Roboto Condensed', 'Source Sans Pro';
        --fonts-roboto: 'Roboto Condensed', 'Source Sans Pro';
    }

    /* ---------- AppBar ---------- */

    #gmConfigAppBar {
        cursor: pointer;
        font-size: 1.2rem;
        margin: .25rem;
    }

    /* ---------- Animations ---------- */

    @keyframes blinker {

        50% {
            opacity: .2;
        }

    }

    @keyframes textglow {

        0% {
            text-shadow: 0px 0px 5px #2078b9;
        }

        100% {
            text-shadow: 0px 0px 20px #2078b9;
        }

    }

    @keyframes pop {

        0% {
            transform: scale(1.1);
            -webkit-transform: scale(1.1);
        }

        100% {
            transform: scale(0.90);
            -webkit-transform: scale(0.90);
        }

    }

    /* ---------- Headers ---------- */

    #itemTitle > div,
    #appbar h1,
    #bookTitle {
        color: #efefef;
        font-family: var(--fonts-lilita);
        font-size: 2rem;
        text-shadow: 0px 0px 15px #000000;
    }


    ${SETTINGS.customFontToggle == 'Everywhere' ? `
    *:not(.material-symbols) {
        font-family: var(--fonts-roboto);
    }` : '' }

`)

// ItemPage styling
GM_addStyle(`

    .itemBackground {
    }

    .blurEffect {
        backdrop-filter: blur(75px);
    }


    .itemMetaRows,
    .descriptionContainer {
        background: #00000059;
        border-radius: 5px;
        padding: 10px;
    }

    .itemMetaRows {
        padding: 1px 0px 15px 20px;
    }

    .itemProgress {
        background: #00000059;
    }

    .itemButton {
        padding: 5px 8px 5px 8px;
    }

    .itemButton:hover {
        background: #393939;
    }

    .itemButtonGlass {
        background: #00000059;
        border: none;
    }

    .itemButtonGlass:hover {
        background: #00000082;
        border: none;
    }

    .itemDropdown {
        background: #00000059;
    }

    div:has(.itemDropdown) table {
        border: none;
    }

    div:has(.itemDropdown) table tr {
        background: #00000082;
    }
    div:has(.itemDropdown) table tr:nth-child(2n) {
        background: #00000059;
    }

`)


// MatchTab styling
GM_addStyle(`

    /* ---------- Edit Panel ---------- */

    #editPanel:has(#match-wrapper) {
        /* edit panel size */
        height: ${SETTINGS.matchTabHeight} !important;
        width: ${SETTINGS.matchTabWidth} !important;
    }

    #editPanel #matchTab {
        font-family: var(--fonts-lilita);
        font-weight: 400,

    }

    ${SETTINGS.customFontToggle == 'Edit Panel' ? `
    #editPanel *:not(.material-symbols) {
        font-family: var(--fonts-roboto);
    }` : '' }

    /* ---------- Search Bar Row ---------- */

    #gmconfigShortcut {
        cursor: pointer;
        font-size: 1rem;
        position: absolute;
        right: 5px;
        top: 5px;
    }

    div.currentCover {
        /* current cover size */
        max-height: ${SETTINGS.currentCoverHeight};
        box-shadow: 0px 0px 10px #000000;
        margin-right: 10px;
        margin-top: -12px;
        border-radius: 3px;
    }

    img.currentCover {
        /* current cover size */
        max-height: inherit;
        max-width: inherit;
        border-radius: 3px;
        border: 1px solid #000000;
    }

    div:has(> div.currentCover) {
        /* search bar vertical item alignment */
        align-items: end;
    }

    #labelInputTitle.titleSearchReady {
        text-shadow: 0px 0px 8px rgb(22, 84, 0);
        animation: blinker 1s linear infinite;
    }

    #match-wrapper form div:has( > div > div > input[placeholder="Author"]) {
        /* search author size */
        width: 110px;
    }

    /* ---------- Match Results Grid ---------- */

    div.matchListWrapper {
        /* MatchTab grid view */
        display: grid;
        grid-template-columns: repeat(${SETTINGS.matchTabColumns}, auto);
        height: unset;
        max-height: calc(100% - 80px);
        scrollbar-color: #7a7a7a #0000;
        scrollbar-width: thin;
        padding: 0px 5px 0px 0px;
        gap: 5px;
    }

    .noResults {
        font-size: 1.5rem;
        animation: pop .50s linear infinite alternate;
    }

    .resultContainer {
        border: none;
        padding: 2px 0px 0.5rem 2px;
    }

    .itemCover,
    .resultCover {
        /* match cover size */
        height: unset;
        max-height: ${SETTINGS.matchCoverHeight};
        max-width: ${SETTINGS.matchCoverHeight};
        border-radius: 5px;
        min-width: unset;
        position: relative;
        width: unset;
        box-shadow: 0px 0px 10px #000000;
        margin: 0px 0px 0px 5px;

    }

    .resultCoverImg {
        border-radius: 5px;
        border: 1px solid #000000;
    }

    .hoverCoverToggle,
    .resultCoverDimensions {
        /* cover dimensions */
        background: #0000006e;
        border-radius: 25px;
        font-size: x-small;
        left: 3px;
        padding: 1px 7px;
        position: absolute;
        top: 5px;
        width: fit-content;
        z-index: 999;
    }

    .hoverCoverToggle {
        font-size: 1rem;
    }


    .resultMeta {
        /* match metadata size */
        width: fit-content;
        max-height: ${SETTINGS.matchCoverHeight};
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: #555 #0000;
    }

    .resultTitle h1 {
        /* match titles */
        font-weight: 600;
        font-size: 1.1rem;
        text-shadow: 0px 0px 10px #000000;
    }

    .resultSeries > div.rounded-full {
        /* match series */
        background-color: #00000080;
    }

    .resultSeries p {
        /* match series */
        color: white;
        font-size: .8rem;
        padding: 3px 5px 3px 5px;
    }

    .resultSynopsis {
        /* match synopsis size */
        max-height: 100%;
        overflow: initial;
    }

    div.bg-success\\\/80 {
        box-shadow: 0px 0px 15px #48974b;
        border: 1px solid #FFFFFF;
        animation: blinker .75s linear infinite;

    }

    /* ---------- Match Result Buttons ---------- */

    div.scriptButtons {
        display: grid;
        grid-template-columns: repeat(3, auto);
        margin: 5px 15px 5px 3px;
        gap: 15px;
    }

    button.resultButton {
        /* ABSidekick Button sizes */
        border-radius: var(--radius-md);
        border: none;
        cursor: pointer;
        font-size: medium;
        padding: 3px;
        width: unset;
    }

    button.saveResult {
        background-color: #113400;
        border: #A0DA83 solid 1px;
        color: #A0DA83;
    }

    button.saveResult:hover {
        background-color: #1d5900;
    }

    button.saveResultTags {
        background-color: #153245;
        border: #B6D3E7 solid 1px;
        color: #B6D3E7;
    }

    button.saveResultTags:hover {
        background-color: #224f6d;
    }

    button.asinSearch {
        background-color: #431C00;
        color: #F09D63;
        border: #F09D63 solid 1px;
    }

    button.asinSearch:hover {
        background-color: #7C3400;
    }

    /* ---------- Enlarged Cover Hover ---------- */

    #hoverCoverContainer {
        background: #00000050;
        display: none;
    }

    #hoverCoverContainer.active {
        /* enlarged img panel */
        border-radius: 10px;
        box-shadow: 0px 0px 20px #000000;
        border: 1px solid black;
        display: unset;
        max-height: ${SETTINGS.hoverCoverHeight};
        max-width: ${SETTINGS.hoverCoverHeight};
        position: fixed;
        z-index: 999;
    }

    /* ---------- AutoMatch ---------- */

    .autoMatchSelection {
        border-radius: 6px;
        background-color: rgba(93, 175, 76, 0.46);
        box-shadow: 0px 0px 5px rgba(93, 175, 76, 0.46);
    }

    .autoMatchSelection .resultDetails p,
    .autoMatchSelection .resultSynopsis p {
        color: var(--color-gray-300);
    }

    button.autoMatchCancel {
        border: 1px solid #4A5565;
        bottom: 5%;
        box-shadow: 0px 0px 10px #4A5565;
        cursor: pointer;
        left: 5%;
        padding: 15px 30px 15px 30px;
        position: fixed;
        z-index: 9999;
        animation: pop .50s linear infinite alternate;
    }

    button.autoMatchCancel:hover {
        background-color: #393939;
    }

`)
