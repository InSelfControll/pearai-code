/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as electron from 'electron';
import { memoize } from '../../../base/common/decorators.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Event } from '../../../base/common/event.js';
import { asJson } from '../../request/common/request.js';
import { hash } from '../../../base/common/hash.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService, IRelaunchHandler, IRelaunchOptions } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IRequestService } from '../../request/common/request.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { AvailableForDownload, IUpdate, State, StateType, UpdateType } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL, UpdateErrorClassification, UpdateNotAvailableClassification } from './abstractUpdateService.js';

export class DarwinUpdateService extends AbstractUpdateService implements IRelaunchHandler {


	@memoize private get onRawError(): Event<string> { return Event.fromNodeEventEmitter(electron.autoUpdater, 'error', (_, message) => message); }
	@memoize private get onRawUpdateNotAvailable(): Event<void> { return Event.fromNodeEventEmitter<void>(electron.autoUpdater, 'update-not-available'); }
	@memoize private get onRawUpdateAvailable(): Event<void> { return Event.fromNodeEventEmitter(electron.autoUpdater, 'update-available'); }
	@memoize private get onRawUpdateDownloaded(): Event<IUpdate> { return Event.fromNodeEventEmitter(electron.autoUpdater, 'update-downloaded', (_, releaseNotes, version, timestamp) => ({ version, productVersion: version, timestamp })); }

	constructor(
		@ILifecycleMainService lifecycleMainService: ILifecycleMainService,
		@IConfigurationService configurationService: IConfigurationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IEnvironmentMainService environmentMainService: IEnvironmentMainService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@IProductService productService: IProductService
	) {
		super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);

		lifecycleMainService.setRelaunchHandler(this);
	}

	handleRelaunch(options?: IRelaunchOptions): boolean {
		if (options?.addArgs || options?.removeArgs) {
			return false; // we cannot apply an update and restart with different args
		}

		if (this.state.type !== StateType.Ready) {
			return false; // we only handle the relaunch when we have a pending update
		}

		this.logService.trace('update#handleRelaunch(): running raw#quitAndInstall()');
		this.doQuitAndInstall();

		return true;
	}

	protected override async initialize(): Promise<void> {
		this.logService.info('DarwinUpdateService: Initializing update service');
		await super.initialize();
		this.logService.debug('DarwinUpdateService: Registering event handlers');
		this.onRawError(this.onError, this, this.disposables);
		this.onRawUpdateAvailable(this.onUpdateAvailable, this, this.disposables);
		this.onRawUpdateDownloaded(this.onUpdateDownloaded, this, this.disposables);
		this.onRawUpdateNotAvailable(this.onUpdateNotAvailable, this, this.disposables);
		this.logService.info('DarwinUpdateService: Initialization complete');
	}

	private onError(err: string): void {
		this.logService.error('DarwinUpdateService: Update error occurred', {
			error: err,
			state: this.state.type,
			explicit: this.state.type === StateType.CheckingForUpdates ? this.state.explicit : undefined
		});
		this.telemetryService.publicLog2<{ messageHash: string }, UpdateErrorClassification>('update:error', { messageHash: String(hash(String(err))) });
		this.logService.error('UpdateService error:', err);

		// only show message when explicitly checking for updates
		const message = (this.state.type === StateType.CheckingForUpdates && this.state.explicit) ? err : undefined;
		this.setState(State.Idle(UpdateType.Archive, message));
	}

	protected buildUpdateFeedUrl(quality: string): string | undefined {
		this.logService.info('DarwinUpdateService: Building update feed URL', {
			quality,
			arch: process.arch
		});
		let assetID: string;
		if (!this.productService.darwinUniversalAssetId) {
			assetID = process.arch === 'x64' ? 'darwin' : 'darwin-arm64';
			this.logService.debug('DarwinUpdateService: Using architecture-specific asset ID', { assetID });
		} else {
			assetID = this.productService.darwinUniversalAssetId;
			this.logService.debug('DarwinUpdateService: Using universal asset ID', { assetID });
		}
		const url = createUpdateURL(assetID, quality, this.productService);
		try {
			this.logService.debug('DarwinUpdateService: Setting feed URL', { url });
			electron.autoUpdater.setFeedURL({ url });

			// Trigger the update check immediately after setting the feed URL
			this.logService.info('DarwinUpdateService: Triggering update check after setting feed URL');
			try {
				electron.autoUpdater.checkForUpdates();
				this.logService.info('DarwinUpdateService: Update check triggered successfully');
			} catch (checkError) {
				this.logService.error('DarwinUpdateService: Error triggering update check', {
					error: checkError,
					url
				});
			}
		} catch (e) {
			this.logService.error('DarwinUpdateService: Failed to set update feed URL', {
				error: e,
				url,
				assetID,
				quality
			});
			return undefined;
		}
		return url;
	}

	protected doCheckForUpdates(context: any): void {
		if (!this.url) {
			this.logService.warn('DarwinUpdateService: No update URL available, skipping update check');
			return;
		}
		this.logService.info('DarwinUpdateService: Checking for updates', {
			url: this.url,
			context,
			currentState: this.state.type
		});
		this.setState(State.CheckingForUpdates(context));

		// For macOS, we need to use electron.autoUpdater.checkForUpdates()
		this.logService.debug('DarwinUpdateService: Triggering electron autoUpdater check');
		try {
			electron.autoUpdater.checkForUpdates();
			this.logService.debug('DarwinUpdateService: electron.autoUpdater.checkForUpdates() called successfully');
		} catch (error) {
			this.logService.error('DarwinUpdateService: Error calling electron.autoUpdater.checkForUpdates()', { error });
		}

		// Also check the update URL directly
		this.logService.debug('DarwinUpdateService: Starting direct URL check', { url: this.url });
		this.requestService.request({ url: this.url }, CancellationToken.None)
			.then<IUpdate | null>(asJson)
			.then(update => {
				this.logService.info('DarwinUpdateService: Update check response received', {
					hasUpdate: !!update,
					version: update?.version,
					productVersion: update?.productVersion
				});
				if (!update || !update.version || !update.productVersion) {
					this.logService.debug('DarwinUpdateService: No valid update available');
					this.telemetryService.publicLog2<{ explicit: boolean }, UpdateNotAvailableClassification>('update:notAvailable', { explicit: !!context });
					this.setState(State.Idle(UpdateType.Archive));
					return;
				}

				this.logService.info('DarwinUpdateService: Valid update found', update);
				this.setState(State.AvailableForDownload(update));
			})
			.then(undefined, err => {
				this.logService.error('DarwinUpdateService: Error checking for updates', {
					error: err,
					url: this.url,
					context,
					errorMessage: err.message,
					errorStack: err.stack
				});
				this.telemetryService.publicLog2<{ messageHash: string }, UpdateErrorClassification>('update:error', { messageHash: String(hash(String(err))) });

				const message = (!!context) ? (err.message || err) : undefined;
				this.setState(State.Idle(UpdateType.Archive, message));
			});
	}

	private onUpdateAvailable(): void {
		this.logService.info('DarwinUpdateService: onUpdateAvailable called', {
			currentState: this.state.type
		});

		if (this.state.type !== StateType.CheckingForUpdates && this.state.type !== StateType.Downloading) {
			this.logService.debug('DarwinUpdateService: Update available event ignored due to invalid state', {
				currentState: this.state.type
			});
			return;
		}

		// On macOS, the download starts automatically after update is available
		if (this.state.type === StateType.Downloading) {
			this.logService.info('DarwinUpdateService: Update is available and downloading automatically', {
				state: this.state.type
			});
		}
	}

	protected override async doDownloadUpdate(state: AvailableForDownload): Promise<void> {
		this.logService.info('DarwinUpdateService: Starting update download', {
			version: state.update.version,
			productVersion: state.update.productVersion,
			timestamp: state.update.timestamp
		});
		this.setState(State.Downloading);

		// On macOS, checkForUpdates() will automatically start the download if an update is available
		this.logService.debug('DarwinUpdateService: Triggering automatic download via checkForUpdates');
		electron.autoUpdater.checkForUpdates();
	}

	private onUpdateDownloaded(update: IUpdate): void {
		this.logService.info('DarwinUpdateService: Update downloaded successfully', {
			version: update.version,
			productVersion: update.productVersion,
			timestamp: update.timestamp
		});
		this.setState(State.Downloaded(update));

		type UpdateDownloadedClassification = {
			owner: 'joaomoreno';
			version: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The version number of the new VS Code that has been downloaded.' };
			comment: 'This is used to know how often VS Code has successfully downloaded the update.';
		};
		this.telemetryService.publicLog2<{ version: String }, UpdateDownloadedClassification>('update:downloaded', { version: update.version });

		this.setState(State.Ready(update));
		this.logService.info('DarwinUpdateService: Update is ready for installation');
	}

	private onUpdateNotAvailable(): void {
		if (this.state.type !== StateType.CheckingForUpdates) {
			this.logService.debug('DarwinUpdateService: Update not available event ignored due to invalid state', {
				currentState: this.state.type
			});
			return;
		}
		this.logService.info('DarwinUpdateService: No updates available', {
			explicit: this.state.explicit
		});
		this.telemetryService.publicLog2<{ explicit: boolean }, UpdateNotAvailableClassification>('update:notAvailable', { explicit: this.state.explicit });

		this.setState(State.Idle(UpdateType.Archive));
	}

	protected override doQuitAndInstall(): void {
		this.logService.info('DarwinUpdateService: Quitting and installing update');
		this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
		electron.autoUpdater.quitAndInstall();
	}


}
