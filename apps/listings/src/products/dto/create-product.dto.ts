import { ProductCondition } from "@app/common/enums/product-condition.enum";
import { IsEnum, IsString } from "class-validator";

export class CreateProductDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsString()
    category: string;

    @IsEnum(ProductCondition)
    condition: ProductCondition;
}
