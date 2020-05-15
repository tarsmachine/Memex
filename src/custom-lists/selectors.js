import { createSelector } from 'reselect'
import { MOBILE_LIST_NAME } from '@worldbrain/memex-storage/lib/mobile-app/features/meta-picker/constants'

// import { selectors } from '../search-filters'
// TODO: check why not working the other way around.
import * as selectors from '../search-filters/selectors'
// import { selectors as filters } from '../overview/filters'

// TODO: Needs some work.
const sortAlphabetically = (a, b) => {
    if (a.name === MOBILE_LIST_NAME) {
        return -100
    }

    if (b.name === MOBILE_LIST_NAME) {
        return 100
    }

    if (a.name.toLowerCase() < b.name.toLowerCase()) {
        return -1
    }
    if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1
    }
    return 0
}

export const customLists = state => state.customLists

export const allLists = createSelector(customLists, state => state.lists)
export const activeListIndex = createSelector(
    customLists,
    state => state.activeListIndex,
)

export const listFilterIndex = createSelector(
    customLists,
    state => state.listFilterIndex,
)

export const getSortedLists = createSelector(allLists, lists => {
    const mobileListIndex = lists.findIndex(
        ({ name }) => name === MOBILE_LIST_NAME,
    )

    if (mobileListIndex === -1) {
        lists = [...lists, { name: MOBILE_LIST_NAME, id: -1 }]
    }

    return lists.sort(sortAlphabetically)
})

export const getUrlsToEdit = createSelector(
    customLists,
    state => state.urlsToEdit,
)

export const results = createSelector(
    getSortedLists,
    activeListIndex,
    selectors.listFilter,
    (lists, listIndex, listFilter) => {
        return lists.map((pageDoc, i) => ({
            ...pageDoc,
            isEditing: i === listIndex,
            isFilterIndex: Number(listFilter) === pageDoc.id,
            isMobileList: pageDoc.name === MOBILE_LIST_NAME,
        }))
    },
)

export const deleteConfirmProps = createSelector(
    customLists,
    state => state.deleteConfirmProps,
)
export const isDeleteConfShown = createSelector(
    deleteConfirmProps,
    state => state.isShown,
)

export const deletingIndex = createSelector(
    deleteConfirmProps,
    state => state.deleting,
)

export const deletingID = createSelector(deleteConfirmProps, state => state.id)

export const listEditDropdown = createSelector(
    customLists,
    state => state.listEditDropdown,
)

export const showAddToList = createSelector(
    customLists,
    state => state.showAddToList,
)

export const urlDragged = createSelector(customLists, state => state.urlDragged)

export const showCreateListForm = createSelector(
    customLists,
    state => state.showCreateListForm,
)

export const showCommonNameWarning = createSelector(
    customLists,
    state => state.showCommonNameWarning,
)

export const showCrowdFundingModal = createSelector(
    customLists,
    state => state.showCrowdFundingModal,
)

export const activeCollectionName = createSelector(
    selectors.listFilter,
    allLists,
    (listFilterId, lists) =>
        listFilterId
            ? lists
                  .filter(list => list.id === Number(listFilterId))
                  .map(list => list.name)[0]
            : undefined,
)
