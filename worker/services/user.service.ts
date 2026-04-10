import type { User } from "better-auth"

export class UserService {
  private _user!: User

  public getUser(): User {
    return this._user
  }

  public setUser(user: User) {
    this._user = user
  }
}
