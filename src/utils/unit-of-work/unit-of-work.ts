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
import { 
	getCourseFactory, 
	getInstructorFactory, 
	getStudentFactory, 
	getTokenFactory
} from "../../global-config";
import { StudentRepository } from "../../student";
import { InstructorRepository } from "../../instructor";
import { TokenRepository } from "../../token";


//! Do not export this Repositories enum at any cost.
enum Repositories {
	courseRepository = "CourseRepository",
	studentRepository = "StudentRepository",
	instructorRepository = "InstructorRepository",
	tokenRepository = "TokenRepository"
}

class UnitOfWorkImpl implements UnitOfWork {

	private _repositories = [
		Repositories.courseRepository,
		Repositories.studentRepository,
		Repositories.instructorRepository,
		Repositories.tokenRepository
	];

	private _mongoDBRepository: MongoDBRepository;
	private _courseRepository: CourseRepository;
	private _studentRepository: StudentRepository;
	private _instructorRepository: InstructorRepository;
	private _tokenRepository: TokenRepository;

	constructor() {
		this._mongoDBRepository = getMongoDBRepository();

		this._courseRepository = getCourseFactory().make("CourseRepository") as CourseRepository;
		this._courseRepository.mongoDBRepository = this._mongoDBRepository;

		this._studentRepository = getStudentFactory().make("StudentRepository") as StudentRepository;
		this._studentRepository.mongoDBRepository = this._mongoDBRepository;

		this._instructorRepository = getInstructorFactory().make("InstructorRepository") as InstructorRepository;
		this._instructorRepository.mongoDBRepository = this._mongoDBRepository;

		this._tokenRepository = getTokenFactory().make("TokenRepository") as TokenRepository;
		this._tokenRepository.mongoDBRepository = this._mongoDBRepository;
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

		if (repositoryName === Repositories.instructorRepository)
			return this._instructorRepository;

		if (repositoryName === Repositories.tokenRepository)
			return this._tokenRepository;

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