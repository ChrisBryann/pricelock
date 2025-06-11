import { IsNotEmpty, IsNumber, IsString, IsUUID } from "class-validator";

export class CreateCommitmentDto {
    @IsString()
    @IsUUID()
    @IsNotEmpty()
    listingId: string;

    // @IsString()
    // @IsUUID()
    // @IsNotEmpty()
    // buyerId: string; // get this from auth gateway guard

    @IsNumber()
    @IsNotEmpty()
    quantity: number;
}