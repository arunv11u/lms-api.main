/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-lines */
import { MongoDBRepository } from "@arunvaradharajalu/common.mongodb-api";
import { GenericError } from "../errors";
import {
	ErrorCodes,
	Repository,
	UnitOfWork
} from "../types";
import { getMongoDBRepository } from "../helpers";
import { CourseRepository } from "../../course";
import { getCourseFactory, getStudentFactory } from "../../global-config";
import { StudentRepository } from "../../student";


//! Do not export this Repositories enum at any cost.
enum Repositories {
	courseRepository = "CourseRepository",
	studentRepository = "StudentRepository"
}

class UnitOfWorkImpl implements UnitOfWork {

	private _repositories = [
		Repositories.courseRepository,
		Repositories.studentRepository
	];

	private _mongoDBRepository: MongoDBRepository;
	private _courseRepository: CourseRepository;
	private _studentRepository: StudentRepository;

	constructor() {
		this._mongoDBRepository = getMongoDBRepository();

		this._courseRepository = getCourseFactory().make("CourseRepository") as CourseRepository;
		this._courseRepository.mongoDBRepository = this._mongoDBRepository;

		this._studentRepository = getStudentFactory().make("StudentRepository") as StudentRepository;
		this._studentRepository.mongoDBRepository = this._mongoDBRepository;
	}

	async start() {
		await this._mongoDBRepository.startTransaction();
	}

	getAllRepositoryNames() {
		return this._repositories;
	}

	getRepository(repositoryName: string): Repository {

		if (repositoryName === Repositories.courseRepository)
			return this._courseRepository;

		if (repositoryName === Repositories.studentRepository)
			return this._studentRepository;
		
		throw new GenericError({
			code: ErrorCodes.internalError,
			error: new Error("Given repository not found"),
			errorCode: 500
		});
	}

	async complete() {
		await this._mongoDBRepository.commitTransaction();
	}

	async dispose() {
		await this._mongoDBRepository.abortTransaction();
	}
}

export {
	UnitOfWorkImpl
};