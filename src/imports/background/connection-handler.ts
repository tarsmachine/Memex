import { CMDS, DEF_CONCURRENCY } from 'src/options/imports/constants'
import ProgressManager from './progress-manager'
import getImportStateManager from './state-manager'
import { SearchIndex } from 'src/search'
import { browser } from 'webextension-polyfill-ts'
import TagsBackground from 'src/tags/background'
import CustomListBackground from 'src/custom-lists/background'

export default class ImportConnectionHandler {
    static IMPORTS_PROGRESS_KEY = 'is-imports-in-progress'

    /**
     * @type {runtime.Port} Runtime connection port to afford message communication with UI script
     */
    port

    /**
     * @type {ImportProgressManager} Importer instance
     */
    importer

    /**
     * @type {boolean} Used to flag special quick imports on first install.
     */
    _quickMode

    _includeErrs = false

    constructor(options: {
        port: any
        quick?: boolean
        searchIndex: SearchIndex
        tagsModule: TagsBackground
        customListsModule: CustomListBackground
    }) {
        // Main `runtime.Port` that this class hides away to handle connection with the imports UI script
        this.port = options.port

        // Quick mode used to quickly import recent history for onboarding; some functionality differs
        this._quickMode = options.quick

        // Initialize the `ProgressManager` to run the import processing logic on import items state
        this.importer = new ProgressManager({
            concurrency: DEF_CONCURRENCY,
            observer: this.itemObserver,
            stateManager: getImportStateManager(),
            searchIndex: options.searchIndex,
            tagsModule: options.tagsModule,
            customListsModule: options.customListsModule,
        })

        // Handle any incoming UI messages to control the importer
        options.port.onMessage.addListener(this.messageListener)

        // Handle UI disconnection by stopping (pausing) progress
        options.port.onDisconnect.addListener(() => this.importer.stop())

        this.attemptRehydrate()
    }

    async attemptRehydrate() {
        // If import isn't already running, get estimates and set view state to init...
        const importInProgress = await this.getImportInProgressFlag()

        if (!importInProgress) {
            // Make sure estimates view init'd with count data
            const estimateCounts = await getImportStateManager().fetchEsts(
                [],
                this._quickMode,
            )
            this.port.postMessage({ cmd: CMDS.INIT, ...estimateCounts })
        } else {
            // ... else make sure to start UI in paused state
            this.port.postMessage({ cmd: CMDS.PAUSE })
        }
    }

    /**
     * Object containing `next` and `complete` methods for the `ProgressManager` to
     * pass messages back along the connection as it observes import items finishing
     * (currently used to send item data for display in the UI).
     */
    itemObserver = {
        next: msg => this.port.postMessage({ cmd: CMDS.NEXT, ...msg }),
        complete: () => {
            this.port.postMessage({ cmd: CMDS.COMPLETE })
            this.setImportInProgressFlag(false)
        },
    }

    /**
     * Main message listener that handles any messages sent from the UI script.
     */
    messageListener = ({ cmd, payload }) => {
        switch (cmd) {
            case CMDS.START:
                return this.startImport(
                    payload.allowTypes,
                    payload.blobUrl,
                    payload.options,
                )
            case CMDS.RESUME:
                return this.importer.start()
            case CMDS.PAUSE:
                return this.importer.stop()
            case CMDS.CANCEL:
                return this.cancelImport()
            case CMDS.FINISH:
                return this.finishImport()
            case CMDS.RECALC:
                return this.recalcState(payload.allowTypes, payload.blobUrl)
            case CMDS.SET_CONCURRENCY:
                return (this.importer.concurrency = payload)
            case CMDS.SET_PROCESS_ERRS:
                return this.setProcessErrs(payload)
            default:
                return console.error(`unknown command: ${cmd}`)
        }
    }

    async setProcessErrs(includeErrs) {
        this._includeErrs = includeErrs
        await this.recalcState()
    }

    async recalcState(allowTypes?, blobUrl = null) {
        getImportStateManager().dirtyEstsCache()
        getImportStateManager().allowTypes = allowTypes

        const estimateCounts = await getImportStateManager().fetchEsts(
            blobUrl,
            this._quickMode,
            this._includeErrs,
        )

        this.port.postMessage({ cmd: CMDS.INIT, ...estimateCounts })
    }

    /**
     * @param {any} allowTypes Object with keys as valid import types pointing to bool values denoting whether
     * or not to process that given type of imports.
     */
    async startImport(allowTypes, blobUrl = null, options = {}) {
        getImportStateManager().allowTypes = allowTypes
        getImportStateManager().options = options

        if (!(await this.getImportInProgressFlag())) {
            await getImportStateManager().fetchEsts(blobUrl, this._quickMode)
        }

        this.port.postMessage({ cmd: CMDS.START }) // Tell UI to finish loading state and move into progress view

        this.setImportInProgressFlag(true)
        this.importer.start()
    }

    /**
     * The cleanup logic that happens when user chooses to finish an import
     * (either after completion or cancellation).
     */
    async finishImport() {
        this.setImportInProgressFlag(false)

        // Re-init the estimates view with updated estimates data
        const estimateCounts = await getImportStateManager().fetchEsts(
            null,
            this._quickMode,
        )
        this.port.postMessage({ cmd: CMDS.INIT, ...estimateCounts })
    }

    async cancelImport() {
        this.importer.stop()
        this.setImportInProgressFlag(false)

        // Resume UI at complete state
        this.port.postMessage({ cmd: CMDS.COMPLETE })
    }

    async getImportInProgressFlag() {
        const storage = await browser.storage.local.get({
            [ImportConnectionHandler.IMPORTS_PROGRESS_KEY]: false,
        })

        return storage[ImportConnectionHandler.IMPORTS_PROGRESS_KEY]
    }

    async setImportInProgressFlag(value) {
        return browser.storage.local.set({
            [ImportConnectionHandler.IMPORTS_PROGRESS_KEY]: value,
        })
    }
}
