type Nullable<T> = T | null;

export interface NotificationInfo {
	title: string;
	message: string;
	icon?: Nullable<string>;
	
	duration: number;

	titleColor?: string;
	messageColor?: string;
}

export interface NotificationAPI {
	create: (info: NotificationInfo) => number;
	edit: (id: number, info: NotificationInfo) => boolean;
	delete: (id: number) => boolean;
}
