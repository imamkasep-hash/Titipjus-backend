import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<{
        id: any;
        role: any;
        phone: any;
        full_name: any;
        status: any;
        created_at: any;
    }[]>;
    me(req: any): Promise<any>;
}
