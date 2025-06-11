import { JwtPayload } from './jwt-payload.interface';

export interface UserPayload extends JwtPayload {
  id: string;
}
