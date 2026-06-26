import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Reorder an album's timeline. `orderedItemIds` is the full set of item ids in
 * the desired display order; each item's `position` is rewritten to its index.
 * Ids not belonging to the album are ignored.
 */
export class ReorderAlbumItemsDto {
  @ApiProperty({
    description: 'Album item ids in the desired order',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  orderedItemIds: string[];
}
