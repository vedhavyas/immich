import { UserEntity } from '@app/database/entities/user.entity';
import { InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

export interface IUserRepository {
  get(id: string, withDeleted?: boolean): Promise<UserEntity | null>;
  getAdmin(): Promise<UserEntity | null>;
  getByEmail(email: string, withPassword?: boolean): Promise<UserEntity | null>;
  getByOAuthId(oauthId: string): Promise<UserEntity | null>;
  getList(filter?: UserListFilter): Promise<UserEntity[]>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, user: Partial<UserEntity>): Promise<UserEntity>;
  delete(user: UserEntity): Promise<UserEntity>;
  restore(user: UserEntity): Promise<UserEntity>;
}

export interface UserListFilter {
  excludeId?: string;
}

export const USER_REPOSITORY = 'USER_REPOSITORY';

export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async get(userId: string, withDeleted?: boolean): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id: userId }, withDeleted: withDeleted });
  }

  async getAdmin(): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { isAdmin: true } });
  }

  async getByEmail(email: string, withPassword?: boolean): Promise<UserEntity | null> {
    let builder = this.userRepository.createQueryBuilder('user').where({ email });

    if (withPassword) {
      builder = builder.addSelect('user.password');
    }

    return builder.getOne();
  }

  async getByOAuthId(oauthId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { oauthId } });
  }

  async getList({ excludeId }: UserListFilter = {}): Promise<UserEntity[]> {
    if (!excludeId) {
      return this.userRepository.find(); // TODO: this should also be ordered the same as below
    }
    return this.userRepository.find({
      where: { id: Not(excludeId) },
      withDeleted: true,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async create(user: Partial<UserEntity>): Promise<UserEntity> {
    return this.userRepository.save(user);
  }

  async update(id: string, user: Partial<UserEntity>): Promise<UserEntity> {
    user.id = id;

    await this.userRepository.save(user);
    const updatedUser = await this.get(id);
    if (!updatedUser) {
      throw new InternalServerErrorException('Cannot reload user after update');
    }
    return updatedUser;
  }

  async delete(user: UserEntity): Promise<UserEntity> {
    return this.userRepository.softRemove(user);
  }

  async restore(user: UserEntity): Promise<UserEntity> {
    return this.userRepository.recover(user);
  }
}
