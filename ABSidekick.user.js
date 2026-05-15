// ==UserScript==

// ----------------------------------- Metadata --------------------------------------

// @name        ABSidekick
// @author      WirlyWirly
// @version     0.85
// @homepage    https://github.com/WirlyWirly/ABSidekick
// @description A sidekick for the AudioBookShelf web interface
//              Written on 🐺 LibreWolf via 🐵 Violentmonkey

// ----------------------------------- Matches --------------------------------------

// If ABSidekick does not run automatically, edit this '@match' line so that it has the same Audiobookshelf IP:PORT as used in the browser
// @match       http://localhost:13378/audiobookshelf/*

// @include     /https?://.+/audiobookshelf/.*/

// ----------------------------------- Permissions --------------------------------------

// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_info
// @grant       GM_listValues
// @grant       GM_registerMenuCommand
// @grant       GM_setValue

// ----------------------------------- Other --------------------------------------

// @namespace   WirlyScripts
// @run-at      document-end
// @supportURL  https://github.com/WirlyWirly/ABSidekick/discussions

// ----------------------------------- Dependencies --------------------------------------

// @require     https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js

// ----------------------------------- Script Links --------------------------------------

// @icon        https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/.github/assets/icon.webp?raw=true
// @updateURL   https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/ABSidekick.user.js?raw=true
// @downloadURL https://raw.githubusercontent.com/WirlyWirly/ABSidekick/main/ABSidekick.user.js?raw=true

// ==/UserScript==

// =================================== CODE ======================================

// The current domain, which will be used when generating Audiobookshelf urls
let absURL = document.URL.match(/^(.+?\/audiobookshelf)\//)[1]

// Initialize the GM_config settings panel and populate the global SETTINGS object
let SETTINGS = gmcSettingsPanel()

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

// The functions that will monitor main elements and then initiate injections when the desired target is ready
appContentMain() // ItemPage
editPanelMain() // MatchTab

// =================================== MAINS ======================================

async function appContentMain() {
    // Setup a MutationObserver to monitor the #app-content element for changes, which indicates a new page-type has been loaded and needs to be handled

    let appContent = await waitForElement('#app-content', document.body)

    // Check if the initial page load was already an itemPage
    appContent.querySelector('#item-page-wrapper') ? itemPageInjector(appContent.querySelector('#item-page-wrapper')) : null

    // Check if the initial page load was already a library\Series page
    appContent.querySelector(':scope > div > #bookshelf:not([data-absidekick-injected])') ? librarySeriesInjector(appContent.querySelector('#bookshelf')) : null

    let appContentObserver = new MutationObserver(async function(mutations) {
        // The actions to perform when new mutations are detected to the '#app-content' element (switching tabs)

        let itemPage = appContent.querySelector('div > #item-page-wrapper:not([data-absidekick-injected])')
        let bookshelfPage = appContent.querySelector('div > #bookshelf:not([data-absidekick-injected])')

        if ( itemPage ) {
            // This is a itemPage (book page)

            itemPageInjector(itemPage)

        } else if ( bookshelfPage ) {
            // This is a bookshelfPage (Home\Library\Series\Collections\Authors\Narrators\Stats)

            let bookshelfObserver = new MutationObserver(async function(mutations) {

                if ( bookshelfPage.querySelector(':scope > div[id="shelf-0"]') ) {
                    // The 'Home' or 'Library' or 'Series' tab was loaded
                    bookshelfObserver.disconnect()
                    //librarySeriesInjector(bookshelfPage)

                } else if ( bookshelfPage.querySelector(':scope > div:last-child:nth-child(2)') ) {
                    // The 'Home' tab was loaded
                    bookshelfObserver.disconnect()

                }





            })

            bookshelfObserver.observe(bookshelfPage, { childList: true })
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

    // Verify that this is the correct modalOverlay by querying for the 6 <button> elements that are used as the tabs in the Edit Panel
    let editPanel = await waitForElement('div.relative:has(div[role="tablist"] > button:last-child:nth-child(6))', modalOverlay)

    // Set identifiers for the edit panel and elements of interest
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

    itemPage.setAttribute('data-absidekick-injected', '')

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

    document.querySelector('#metadataSection').style.position = 'relative'
    // Background blur
    if ( SETTINGS.itemBackgroundBlur ) {

        let coverURL = itemPage.querySelector('#itemCover').src
        itemPage.parentElement.style.background = `url('${coverURL}') no-repeat center center fixed`
        itemPage.parentElement.style.backgroundColor = '#0000'
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
    let metadata = await fetchItemMetadata(itemId)

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


async function librarySeriesInjector(bookshelfPage) {

    bookshelfPage.setAttribute('data-absidekick-injected', '')

    // Wait until a cover image is available, indicating that the items have finished loading
    await waitForElement('img[src*="/api/items/', bookshelfPage)

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

    // The `🏷️ Not Found` button
    let notFoundButton = document.createElement('button')
    matchTab.querySelector('#buttonSearch').insertAdjacentElement('afterend', notFoundButton)
    notFoundButton.id = `buttonNotFound`
    notFoundButton.innerText = `🏷️ Not Found`
    notFoundButton.title = `Tag this item as not found, then continue to the next book in the list\n\n🏷️ Tags: ${SETTINGS.notFoundTagsList}`
    notFoundButton.setAttribute('class', 'buttonNotFound abs-btn rounded-md shadow-md relative border border-gray-600 mt-5 ml-1 text-white bg-primary px-8 py-2')
    notFoundButton.addEventListener('click', async function(event) {

        if ( SETTINGS.apiKey == '' ) {
            window.alert('❌ ABSidekick ❌\n\nThis button requires a valid ApiKey\n\nProvide an ApiKey in the ABSidekick settings panel')
            return
        } else {

            if ( matchTab.querySelector('img.currentCover') ) {
                // There is a current cover, so parse from it the absId then set the notFound tag

                let absId = matchTab.querySelector('img.currentCover').src.match('\/api\/items\/(.+)\/cover')[1]

                // GET the current saved tags
                let metadata = await fetchItemMetadata(absId)
                let currentTags = metadata.media.tags

                // PATCH the current + custom tags
                fetch(`${absURL}/api/items/${absId}/media`, {
                    method: 'PATCH',
                    body: JSON.stringify({ tags: currentTags.concat(SETTINGS.notFoundTagsList) }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SETTINGS.apiKey}`
                    },
                }).then(function(response) {
                    // The PATCH was successful, so cycle to the next item
                    cleanMatchTab()
                    SETTINGS.navigationDirection == 'Right' ? editPanel.querySelector('#navigateRight').click() : null
                    SETTINGS.navigationDirection == 'Left' ? editPanel.querySelector('#navigateLeft').click() : null
                })


            } else {
                // There is not a current cover, so get it from the cover tab

                // observer.disconnect()

                // let absId = this.dataset.absId
                // let metadata = await fetchItemMetadata(absId)
                // let currentTags = metadata.media.tags
                // let additionalTags = SETTINGS.notFoundTagsList

            }

        }

    })

    // Create the 'Title' search button
    let titleSearchButton = document.createElement('button')
    titleSearchButton.id = 'buttonTitle'
    titleSearchButton.innerText = 'Title'
    titleSearchButton.setAttribute('class', 'abs-btn rounded-md shadow-md relative border border-gray-600 mt-5 ml-1 text-white bg-primary px-8 py-2')
    titleSearchButton.title = 'Fill the search field with the current title'
    matchTab.querySelector('form > div').appendChild(titleSearchButton)
    titleSearchButton.addEventListener('click', function(event) {
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
        autoMatchButton.title = `AutoMatch is enabled\n\nClick or press <TAB> to cancel\n\nℹ️ Confidence: >= ${SETTINGS.autoMatchConfidence}`
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

                // After the result images have a chance to load, create the Dimensions label
                setTimeout(() => {

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

                // Save Button
                let saveResultButton = document.createElement('button')
                saveResultButton.innerText = 'Save Match'
                saveResultButton.title = "Save this match result then continue to the next book\n\nℹ️ This is the same as clicking the 'Submit' button of the match result"
                saveResultButton.classList.add('saveResult', 'resultButton')
                saveResultButton.addEventListener('click', function(event) {
                    event.button == 0 ? saveResult(this) : null
                    observer.disconnect()
                })

                // Save + Tag Button
                let saveTagButton = document.createElement('button')
                saveTagButton.innerText = `Save + 🏷️`
                saveTagButton.title = `Save this match result, add the custom tags, then continue to the next book\n\n🏷️ Tags: ${SETTINGS.saveTagsList}`
                saveTagButton.classList.add('saveResultTags', 'resultButton')
                saveTagButton.addEventListener('click', function(event) {

                    if ( SETTINGS.apiKey == '' ) {
                        window.alert('❌ ABSidekick ❌\n\nThis button requires a valid ApiKey\n\nProvide an ApiKey in the ABSidekick settings panel')
                        return
                    } else {
                        observer.disconnect()
                        saveResult(this, SETTINGS.saveTagsList)
                    }

                })

                // Audible Button
                let asinButton = document.createElement('button')
                asinButton.innerText = 'Audible'
                asinButton.title = 'Open the Audible page of this match result\n\nℹ️ Only works if the match result has an ASIN'
                asinButton.classList.add('asinSearch', 'resultButton')
                asinButton.addEventListener('mouseup', function(event) {
                    event.button == 0 ? audibleLookup(this) : null
                })

                // Create and populate the element that will contain the ABSidekick buttons
                let buttonHolder = document.createElement('div')
                buttonHolder.classList.add('scriptButtons')

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

                // There is a currentId available and there is not already a current cover
                if ( SETTINGS.currentId && !matchTab.querySelector('img.currentCover') ) {
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

async function fetchItemMetadata(itemId) {
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
    currentCoverElement.innerHTML = `<img class="currentCover" src="${absURL}/api/items/${itemId}/cover?&raw=1" data-abs-id="${itemId}">`

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
        // Remove a previous cover image
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
    // The 'Title' search button of the match tab was clicked or the initial search returned no results

    // The <h1> element at the top of the screen, which displays the title of the current book
    let bookTitle = document.getElementById('bookTitle').innerText

    // Update the search field of the Match tab and simulate an 'input' event
    let matchTab = document.getElementById('match-wrapper')
    let titleField = matchTab.querySelector('#inputTitle')
    titleField.value = bookTitle
    titleField.dispatchEvent(new KeyboardEvent('input'))

    // Update the Search field label to indicate this was a title search
    matchTab.querySelector('#labelInputTitle').innerText = '📖 Title Search!'
    matchTab.querySelector('#labelInputTitle').classList.add('titleSearchReady')

    // Add a class to indicate that a title search has already been readied
    matchTab.querySelector('#resultsList').classList.add('titleSearchReady')

    // Click the search button
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
        autoMatchButton.title = `AutoMatch is enabled\n\nClick or press <Tab> to cancel\n\nℹ️ Confidence: >= ${SETTINGS.autoMatchConfidence}`
        autoMatchButton.style.animation = 'pop .50s linear infinite alternate'

        // Floating button
        let autoMatchCancel = document.createElement('button')
        document.body.appendChild(autoMatchCancel)
        autoMatchCancel.outerHTML = `<button id="autoMatchCancel" title="AutoMatch is enabled\n\nClick or press <Tab> to cancel\n\nℹ️ Confidence: >= ${SETTINGS.autoMatchConfidence}" class="autoMatchCancel bg-primary rounded-md text-white">🤖 AutoMatch</button>`
        autoMatchCancel = document.getElementById('autoMatchCancel')
        autoMatchCancel.addEventListener('click', function(event) { autoMatchStop() })

        // Global "TAB" Automatch cancel
        window.addEventListener('keydown', autoMatchKeyStop)
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


function autoMatchKeyStop(event) {
    // The window event to cancel AutoMatch when <TAB> is pressed, specified globally so that the event can be added\removed within other functions
    event.key == 'Tab' ? autoMatchStop() : null

}


function autoMatchStop() {
    // Stop AutoMatch and revert elements to their default status

    SETTINGS.autoMatchEnabled = false

    try {

        // Try\catch, just in case the user left the MatchTab

        // Floating button
        document.getElementById('autoMatchCancel') ? document.getElementById('autoMatchCancel').remove() : null

        // Window "TAB" eventListener
        window.removeEventListener('keydown', autoMatchKeyStop)

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
        let metadata = await fetchItemMetadata(SETTINGS.previousId)
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

function gmcSettingsPanel() {
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
                'title': "When AutoMatch is enabled, the first match result with AT-LEAST this confidence score will be the one that is selected and then saved\n\nℹ️ Click the '🤖 AutoMatch' button or press <TAB> to stop AutoMatch"
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
                'label': "Tags: Save + 🏷️",
                'type': 'text',
                'default': '',
                'title': "A comma seperated list of tags that will be applied to a book when clicking the 'Save + 🏷️' button\n\nℹ️ Setting a unique tag is a simple way to distinguish books that have already been matched, either for simple record keeping or for future scripting"
            },

            'notFoundTagsList': {
                'label': "Tags: 🏷️ Not Found",
                'type': 'text',
                'default': '',
                'title': "A comma seperated list of tags that will be applied to a book when clicking the '🏷️ Not Found' button\n\nℹ️ Setting a unique tag is a simple way to distinguish books that have not had a proper match, either for simple record keeping or for future attempts\\scripting"
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
                'default': 1,
                'title': `The number of custom button rows that will be generated\n\nThe 'Button Name' is what will be displayed in Audiobookshelf, while the 'Search Template' is the URL that will be opened in a new tab\n\nℹ️ Search Template Variables...\n\n%title% %author% %year% %asin%`
            },

            'customFontToggle': {
                'label': '✏️ Roboto Condensed',
                'type': 'select',
                'options': ['Everywhere', 'Edit Panel', 'Off'],
                'default': 'Everywhere',
                'title': 'Set Roboto Condensed as the default font'
            },

            'globalBlackGlass': {
                'label': 'Black Glass',
                'type': 'checkbox',
                'default': true,
                'title': 'Apply a black glass look across Audiobookshelf'
            },

            'blackGlassRainbow': {
                'label': 'Rainbow Shift',
                'type': 'checkbox',
                'default': false,
                'title': 'When Black Glass is enabled, cycle the background as a dark-rainbow'
            },

            'blackGlassColor': {
                'label': 'Solid Color',
                'type': 'text',
                'default': '#0b142a',
                'title': 'When Black Glass is enabled, specify the primary background color'
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
                document.getElementById('abSidekick_field_notFoundTagsList').placeholder = 'Not Found, Unmatched'

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
        navigationDirection: GM_config.get('navigationDirection'),
        saveTagsList: GM_config.get('saveTagsList').split(','),
        notFoundTagsList: GM_config.get('notFoundTagsList').split(','),

        // Item Pages
        itemBackgroundBlur: GM_config.get('itemBackgroundBlur'),
        itemMetaGlass: GM_config.get('itemMetaGlass'),
        itemProgressGlass: GM_config.get('itemProgressGlass'),
        itemButtonGlass: GM_config.get('itemButtonGlass'),
        itemSummaryGlass: GM_config.get('itemSummaryGlass'),
        itemDropdownGlass: GM_config.get('itemDropdownGlass'),
        customButtonCount: GM_config.get('customButtonCount'),


        // Globals
        customFontToggle: GM_config.get('customFontToggle'),
        globalBlackGlass: GM_config.get('globalBlackGlass'),
        blackGlassRainbow: GM_config.get('blackGlassRainbow'),
        blackGlassColor: GM_config.get('blackGlassColor'),
        audibleTemplate: GM_config.get('audibleTemplate'),
        goodreadsTemplate: GM_config.get('goodreadsTemplate'),
        apiKey: GM_config.get('apiKey'),

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

    /* latin-ext */
    @font-face {
        font-family: 'Lilita One';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        src: url(data:application/octet-stream;base64,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) format('woff2');
    }

    /* latin-ext */
    @font-face {
        font-family: 'Roboto Condensed';
        font-style: normal;
        font-weight: 500;
        font-display: swap;
        unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
        src: url(data:application/octet-stream;base64,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) format('woff2');
    }

    /* latin */
    @font-face {
        font-family: 'Roboto Condensed';
        font-style: normal;
        font-weight: 500;
        font-display: swap;
        src: url(data:application/octet-stream;base64,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) format('woff2');
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }

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
        inset: .5vw .5vw auto auto !important;
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
    #abSidekick #abSidekick_field_notFoundTagsList,
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

    @keyframes rainbow-bg{
            100%,0%{
                background-color: rgb(30, 0, 0);
            }
            8%{
                background-color: rgb(31, 15, 0);
            }
            16%{
                background-color: rgb(30, 30, 0);
            }
            25%{
                background-color: rgb(15, 30, 0);
            }
            33%{
                background-color: rgb(0, 30, 0);
            }
            41%{
                background-color: rgb(0, 31, 15);
            }
            50%{
                background-color: rgb(0, 31, 31);
            }
            58%{
                background-color: rgb(0, 15, 30);
            }
            66%{
                background-color: rgb(0, 0, 30);
            }
            75%{
                background-color: rgb(15, 0, 30);
            }
            83%{
                background-color: rgb(30, 0, 30);
            }
            91%{
                background-color: rgb(32, 0, 16);
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

// Library\Series page styling

GM_addStyle(`

    p[cy-id="title"] {
        font-family: var(--fonts-lilita);
    }

`)

// Black Glass
if ( SETTINGS.globalBlackGlass ) {

    GM_addStyle(`

        :root {
            --color-bg: #000000ec;
            --color-primary: #00000080;
            --color-gray-400: rgb(173, 180, 192);
        }

        #appbar {
            box-shadow: unset;
            border-bottom: 1px solid black;
        }

        #toolbar,
        div[aria-label="Library Sidebar"] {
            background-color: var(--color-primary);
            box-shadow: unset !important;
        }

        #bookshelf,
        #page-wrapper,
        div[aria-label="Library Sidebar"] div,
        div[aria-label="Library Sidebar"] a {
            background-color: #0000;
            background-image: unset;
        }

        #__layout > div:has(#app-content) {

            ${ SETTINGS.blackGlassColor ? `background-color: ${SETTINGS.blackGlassColor};`: 'background-color: #0b142a;' }

            ${ SETTINGS.blackGlassRainbow ? 'animation: rainbow-bg 20s linear infinite;': '' }

        }

        .tracksTable tr {
            background-color: #00000082;
        }

        .tracksTable tr:nth-child(2n) {
            background-color: #12121263;
        }

        .tracksTable tr:hover:not(:has(th)) {
            background-color: #242424;
        }

        #editPanelTabs > button:not(.tab-selected) {
            background-color: #000000b2;
        }

    `)
}

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
        padding: 1px 20px 15px 20px;
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
        min-width: unset !important;
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
        margin-right: 4px;
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

    .itemCover {
        /* item cover size */
        max-height: unset;
        margin: inherit;
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
        z-index: 0;
    }

    .hoverCoverToggle {
        font-size: 1rem;
        z-index: 10;
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
