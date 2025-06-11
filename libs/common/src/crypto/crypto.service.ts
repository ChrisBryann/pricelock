import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CryptoService {

    async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    }

    async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }

    async hashRefeshToken(refreshToken: string): Promise<string> {
        const salt = await bcrypt.genSalt();
        const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
        return hashedRefreshToken;
    }

    async validateRefreshToken(refreshToken: string, hashedRefreshToken: string): Promise<boolean> {
        return await bcrypt.compare(refreshToken, hashedRefreshToken);
    }
}
