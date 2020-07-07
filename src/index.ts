import Collection from '@discordjs/collection';

import { Plugin } from '../../plugin-api';
import { NotificationAPI, NotificationInfo } from './api';

class Notification {
	public id: number;
	public info: NotificationInfo;
	public hideTimeout: NodeJS.Timeout;

	public constructor(id: number, info: NotificationInfo, hideTimeout: NodeJS.Timeout) {
		this.id = id;
		this.info = info;
		this.hideTimeout = hideTimeout;
	}
}

export default class extends Plugin {
	public api: NotificationAPI;

	private notifications: Collection<number, Notification>;

	public constructor() {
		super({
			id: 'notification-api',
			name: 'Notification API',
			description: null,
			version: '1.0.0',
			author: 'Assasans'
		});

		this.api = {
			create: (info: NotificationInfo): number => {
				throw new Error('Plugin not loaded');
			},
			edit: (id: number, info: NotificationInfo): boolean => {
				throw new Error('Plugin not loaded');
			},
			delete: (id: number): boolean => {
				throw new Error('Plugin not loaded');
			}
		};

		this.notifications = new Collection<number, Notification>();
	}

	private async getConfig() {
		const path = await import('path');
		const fs = await import('promise-fs');

		return JSON.parse(await fs.readFile(path.join(__dirname, '../config.json'), {
			encoding: 'utf8'
		}));
	}

	public async load(): Promise<void> {
		const $ = await import('jquery');

		$('head').append($(`<link href="${__dirname}/../css/notifications.css" rel="stylesheet">`));

		$('body').prepend($('<div id="bt-notifications"></div>'));

		this.api = {
			create: (info: NotificationInfo): number => {
				const {
					title, message, icon = null,
					duration,
					titleColor = '#ffffff', messageColor = '#ffffff'
				}: NotificationInfo = info;
	
				const notifications = $('div#bt-notifications');
	
				const id: number = Math.floor(Math.random() * 0xFFFFFFFF);
	
				const notification = $('<div class="bt-notification"></div>');
				const notificationIcon = $('<img class="bt-notification__icon">');
				const notificationContent = $('<div class="bt-notification__content"></div>');
	
				if(icon === null || icon === undefined) {
					notificationIcon.attr('src', null);
					notificationIcon.css('display', 'none');
				} else {
					notificationIcon.attr('src', icon);
					notificationIcon.css('display', 'block');
				}
	
				notificationContent.append($(`<div class="bt-notification__title" style="color: ${titleColor}">${title}</div>`));
				notificationContent.append($(`<div class="bt-notification__message" style="color: ${messageColor}">${message}</div>`));
	
				notification.append(notificationIcon);
				notification.append(notificationContent);
	
				notification.attr('data-notification-id', id);
	
				notifications.append(notification);
	
				const hideTimeout: NodeJS.Timeout = setTimeout(() => {
					this.notifications.delete(id);

					notification.css('left', '-26.5rem');
					setTimeout(() => {
						notification.remove();
					}, 1000);
				}, duration);
	
				this.notifications.set(id, new Notification(id, info, hideTimeout));
	
				return id;
			},
			edit: (id: number, info: NotificationInfo): boolean => {
				const {
					title, message, icon,
					duration,
					titleColor, messageColor
				}: NotificationInfo = info;
	
				const notification: Notification | undefined = this.notifications.get(id);
				if(!notification) return false;
	
				const element = $(`div#bt-notifications > div.bt-notification[data-notification-id="${id}"]`);
				
				console.log(info);

				console.log(title);
				console.log(element);
				console.log(element.children('*'));
				console.log(element.children('div'));
				console.log(element.children('div.bt-notification__content > div.bt-notification__title'));
				if(title) {
					console.log('t');
					element.children('div.bt-notification__content').children('div.bt-notification__title').text(title);
				}
				if(message) element.children('div.bt-notification__content').children('div.bt-notification__message').text(message);
				if(icon === null) {
					element.children('img.bt-notification__icon').attr('src', null);
					element.children('img.bt-notification__icon').css('display', 'none');
				} else if(icon !== undefined) {
					element.children('img.bt-notification__icon').attr('src', icon);
					element.children('img.bt-notification__icon').css('display', 'block');
				}
				if(titleColor) element.children('div.bt-notification__content').children('div.bt-notification__title').css('color', titleColor);
				if(messageColor) element.children('div.bt-notification__content').children('div.bt-notification__message').css('color', messageColor);

				if(duration) {
					clearTimeout(notification.hideTimeout);
					
					const hideTimeout: NodeJS.Timeout = setTimeout(() => {
						this.notifications.delete(id);

						element.css('left', '-26.5rem');
						setTimeout(() => {
							element.remove();
						}, 1000);
					}, duration);
					notification.hideTimeout = hideTimeout;
				}

				notification.info = info;
	
				return true;
			},
			delete: (id: number): boolean => {
				const notification: Notification | undefined = this.notifications.get(id);
				if(!notification) return false;
				
				clearTimeout(notification.hideTimeout);
	
				const element = $(`div#bt-notifications > div.bt-notification[data-notification-id="${id}"]`);

				this.notifications.delete(id);

				element.css('left', '-26.5rem');
				setTimeout(() => {
					element.remove();
				}, 1000);

				return true;
			}
		};
	}

	public async start(): Promise<void> {
		const config = await this.getConfig();

		if(config.errors.sync) {
			window.addEventListener('error', (event) => {
				const error = event.error;
				if(!error.name || !error.message) return;
				
				this.api.create({
					title: `Ошибка: ${error.name}`,
					message: error.message,
					duration: 10000,
					titleColor: '#f51212'
				});
			});
		}

		if(config.errors.promise) {
			window.addEventListener('unhandledrejection', (event) => {
				event.promise.catch((error) => {
					if(!error.name || !error.message) return;

					this.api.create({
						title: `Асинхронная ошибка: ${error.name}`,
						message: error.message,
						duration: 10000,
						titleColor: '#f51212'
					});
				});
			});
		}

		if(config.errors.critical) {
			const instance: Plugin = this;

			const _error = console.error;
			console.error = function error(...args: any[]) {
				if(args[0] === 'ERROR' || args[0] === 'FATAL') {
					const error = args[3];

					if(error && error.name) {
						const key: string | undefined = Object.getOwnPropertyNames(error).find((name) => name.startsWith('message'));
						if(key) {
							const message: string = error[key];
							(instance.api as NotificationAPI).create({
								title: `Критическая ошибка: ${error.name}`,
								message: message,
								duration: 10000,
								titleColor: '#f51212'
							});
						}
					}
				}
				_error(...args);
			}
		}

		/*this.api.create({
			title: 'Notification API',
			message: 'Плагин загружен',
			duration: 3000
		});*/
	}
}
