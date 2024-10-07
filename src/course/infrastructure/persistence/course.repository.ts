import nconf from "nconf";
import { MongoDBRepository } from "@arunvaradharajalu/common.mongodb-api";
import { ObjectId } from "mongodb";
import {
	DocsCountList,
	DocsCountListImpl,
	ErrorCodes,
	GenericError,
	getExtensionFromMimeType,
	getS3Storage,
	getUUIDV4,
	UploadPreSignedURLResponse
} from "../../../utils";
import { getCourseFactory } from "../../../global-config";
import {
	CourseEntity,
	CourseObject,
	CourseRepository
} from "../../domain";
import { CourseFactory } from "../../factory";
import { CourseORMEntity } from "./course.orm-entity";
import { CourseCreatorRepositoryImpl } from "./course-creator.repository";
import { CourseLanguageRepositoryImpl } from "./course-language.repository";
import { CourseLearningRepositoryImpl } from "./course-learning.repository";
import { CourseMaterialAndOfferRepositoryImpl } from "./course-material-and-offer.repository";
import { CourseSectionLectureRepositoryImpl } from "./course-section-lecture.repository";
import { CourseSectionRepositoryImpl } from "./course-section.repository";
import { CourseSubtitleRepositoryImpl } from "./course-subtitle.repository";



export class CourseRepositoryImpl implements CourseRepository, CourseObject {
	private _collectionName = "courses";
	private _mongodbRepository: MongoDBRepository | null = null;
	private _courseFactory: CourseFactory;

	constructor() {
		this._courseFactory = getCourseFactory();
	}

	set mongoDBRepository(mongoDBRepository: MongoDBRepository) {
		this._mongodbRepository = mongoDBRepository;
	}

	getId(): string {
		return new ObjectId().toString();
	}

	getSectionId(): string {
		if (!this._mongodbRepository)
			throw new GenericError({
				code: ErrorCodes.mongoDBRepositoryDoesNotExist,
				error: new Error("MongoDB repository does not exist"),
				errorCode: 500
			});

		const courseSectionRepository =
			new CourseSectionRepositoryImpl(this._mongodbRepository);

		return courseSectionRepository.getId();
	}

	getSectionLectureId(): string {
		if (!this._mongodbRepository)
			throw new GenericError({
				code: ErrorCodes.mongoDBRepositoryDoesNotExist,
				error: new Error("MongoDB repository does not exist"),
				errorCode: 500
			});

		const courseSectionLectureRepository =
			new CourseSectionLectureRepositoryImpl(this._mongodbRepository);

		return courseSectionLectureRepository.getId();
	}

	async getAll(): Promise<DocsCountList<CourseEntity>> {
		if (!this._mongodbRepository)
			throw new GenericError({
				code: ErrorCodes.mongoDBRepositoryDoesNotExist,
				error: new Error("MongoDB repository does not exist"),
				errorCode: 500
			});

		const coursesORMEntity = await this._mongodbRepository
			.find<CourseORMEntity>(
				this._collectionName,
				{}
			);


		const coursesPromises = coursesORMEntity
			.map(async (courseORMEntity) => {
				const courseEntity = await this._getEntity(courseORMEntity);

				return courseEntity;
			});

		const courses = await Promise.all(coursesPromises);

		const docsCountList = new DocsCountListImpl<CourseEntity>();
		docsCountList.count = courses.length;
		docsCountList.docs = courses;

		return docsCountList;
	}

	async uploadCourseImage(
		mimeType: string
	): Promise<UploadPreSignedURLResponse> {
		const extension = getExtensionFromMimeType(mimeType);
		const filename = `${getUUIDV4()}.${extension}`;
		const filePath = `public/courses/images/${filename}`;
		const s3Storage = getS3Storage(nconf.get("s3BucketName"));

		const response = await s3Storage
			.getPreSignedUrlForUploading(filePath, 5 * 60, 2 * 1024 * 1024);

		return response;
	}

	async uploadLectureVideo(
		mimeType: string
	): Promise<UploadPreSignedURLResponse> {
		const extension = getExtensionFromMimeType(mimeType);
		const filename = `${getUUIDV4()}.${extension}`;
		const filePath = `public/courses/raw-lectures/${filename}`;
		const s3Storage = getS3Storage(nconf.get("s3BucketName"));

		const response = await s3Storage
			.getPreSignedUrlForUploading(
				filePath,
				24 * 60 * 60,
				2 * 1024 * 1024 * 1024
			);

		return response;
	}

	async uploadLectureSubtitle(
		mimeType: string
	): Promise<UploadPreSignedURLResponse> {
		const extension = getExtensionFromMimeType(mimeType);
		const filename = `${getUUIDV4()}.${extension}`;
		const filePath = `public/courses/raw-lectures/${filename}`;
		const s3Storage = getS3Storage(nconf.get("s3BucketName"));

		const response = await s3Storage
			.getPreSignedUrlForUploading(
				filePath,
				5 * 60,
				2 * 1024 * 1024
			);

		return response;
	}

	async createCourseByInstructor(
		course: CourseEntity,
		instructorId: string
	): Promise<CourseEntity> {
		if (!this._mongodbRepository)
			throw new GenericError({
				code: ErrorCodes.mongoDBRepositoryDoesNotExist,
				error: new Error("MongoDB repository does not exist"),
				errorCode: 500
			});


		const isCourseTitleAlreadyExists =
			await this._isCourseTitleAlreadyExists(course.title);

		if (isCourseTitleAlreadyExists)
			throw new GenericError({
				code: ErrorCodes.courseTitleAlreadyExists,
				error: new Error("Course title already exists"),
				errorCode: 403
			});

		const courseCreatorRepository =
			new CourseCreatorRepositoryImpl(this._mongodbRepository);
		const courseLanguageRepository =
			new CourseLanguageRepositoryImpl(this._mongodbRepository);
		const courseLearningRepository =
			new CourseLearningRepositoryImpl(this._mongodbRepository);
		const courseMaterialAndOfferRepository =
			new CourseMaterialAndOfferRepositoryImpl(this._mongodbRepository);
		const courseSectionLectureRepository =
			new CourseSectionLectureRepositoryImpl(this._mongodbRepository);
		const courseSectionRepository =
			new CourseSectionRepositoryImpl(this._mongodbRepository);
		const courseSubtitleRepository =
			new CourseSubtitleRepositoryImpl(this._mongodbRepository);

		await courseCreatorRepository
			.addCreatorsByInstructor(course, instructorId);
		await courseLanguageRepository
			.addLanguagesByInstructor(course, instructorId);
		await courseLearningRepository
			.addLearningsByInstructor(course, instructorId);
		await courseMaterialAndOfferRepository
			.addCourseMaterialsAndOffersByInstructor(course, instructorId);
		await courseSectionLectureRepository
			.addLecturesByInstructor(course, instructorId);
		await courseSectionRepository
			.addSectionsByInstructor(course, instructorId);
		await courseSubtitleRepository
			.addSubtitlesByInstructor(course, instructorId);


		const courseORMEntity = new CourseORMEntity();
		courseORMEntity._id = new ObjectId(course.id);
		courseORMEntity.status = course.status;
		courseORMEntity.createdBy = instructorId;
		courseORMEntity.creationDate = new Date();
		courseORMEntity.currency = course.price.currency;
		courseORMEntity.description = course.description;
		courseORMEntity.image = course.image;
		courseORMEntity.isDeleted = false;
		courseORMEntity.lastModifiedBy = instructorId;
		courseORMEntity.lastModifiedDate = new Date(course.lastUpdatedOn);
		courseORMEntity.price = course.price.value;
		courseORMEntity.title = course.title;
		courseORMEntity.version = 1;

		await this._mongodbRepository.add<CourseORMEntity>(
			this._collectionName,
			courseORMEntity
		);

		return course;
	}

	private async _isCourseTitleAlreadyExists(title: string): Promise<boolean> {
		if (!this._mongodbRepository)
			throw new GenericError({
				code: ErrorCodes.mongoDBRepositoryDoesNotExist,
				error: new Error("MongoDB repository does not exist"),
				errorCode: 500
			});

		const course = await this._mongodbRepository
			.findOne<CourseORMEntity>(
				this._collectionName,
				{
					title: title
				}
			);

		if (!course) return false;

		return true;
	}

	private async _getEntity(
		courseORMEntity: CourseORMEntity
	): Promise<CourseEntity> {
		if (!this._mongodbRepository)
			throw new GenericError({
				code: ErrorCodes.mongoDBRepositoryDoesNotExist,
				error: new Error("MongoDB repository does not exist"),
				errorCode: 500
			});

		throw new Error(JSON.stringify(courseORMEntity));
	}
}