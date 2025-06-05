import { GraphQLError } from 'graphql';
import { v4 as uuidv4 } from 'uuid';
import { prismaClient } from '../../lib/db';

// Define our types based on the Prisma schema
type CategoryType = 'SELL' | 'BUY';

interface Category {
  id: string;
  name: string;
  seoName: string;
  categoryType: CategoryType;
  image?: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateCategoryInput {
  name: string;
  seoName: string;
  categoryType: CategoryType;
  image?: any;
  priority?: number;
}

interface UpdateCategoryInput {
  name?: string;
  seoName?: string;
  categoryType?: CategoryType;
  priority?: number;
}

interface CategoryResponse {
  success: boolean;
  message?: string;
  category?: Category;
}

// Temporary mock function until AWS SDK is properly set up
const uploadImageWithoutResize = async (stream: any, mimetype: string, key: string): Promise<string> => {
  // For now, just return a placeholder URL
  console.log('Image upload temporarily disabled - AWS SDK not configured');
  return `placeholder-image-url/${key}`;
};

// Type assertion to help TypeScript understand the Prisma client
const db = prismaClient as unknown as {
  category: {
    findMany: (args: any) => Promise<Category[]>;
    findUnique: (args: any) => Promise<Category | null>;
    create: (args: any) => Promise<Category>;
    update: (args: any) => Promise<Category>;
    delete: (args: any) => Promise<Category>;
  };
};

export const categoryResolvers = {
  Query: {
    getAllCategories: async (): Promise<Category[]> => {
      try {
        console.log('Fetching all categories...');
        const categories = await db.category.findMany({
          orderBy: { priority: 'desc' }
        });
        console.log('Found categories:', categories.map(c => ({ id: c.id, name: c.name, seoName: c.seoName })));
        return categories;
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw new GraphQLError('Failed to fetch categories', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },

    getCategory: async (_: unknown, { id }: { id: string }): Promise<Category> => {
      try {
        const category = await db.category.findUnique({
          where: { id }
        });
        
        if (!category) {
          throw new GraphQLError('Category not found', {
            extensions: { code: 'NOT_FOUND' }
          });
        }
        
        return category;
      } catch (error) {
        console.error('Error fetching category:', error);
        throw new GraphQLError('Failed to fetch category', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    }
  },

  Mutation: {
    createCategory: async (_: unknown, { input }: { input: CreateCategoryInput }): Promise<CategoryResponse> => {
      try {
        const { name, seoName, categoryType, image, priority } = input;
        console.log('Creating category with input:', { name, seoName, categoryType, priority });

        // Check if category with same seoName exists
        const existingCategory = await db.category.findUnique({
          where: { seoName }
        });

        if (existingCategory) {
          console.log('Category with seoName already exists:', seoName);
          throw new GraphQLError('Category with this SEO name already exists', {
            extensions: { code: 'BAD_USER_INPUT' }
          });
        }

        let imageKey: string | undefined;

        if (image) {
          try {
            const { createReadStream, filename, mimetype } = await image;
            const stream = createReadStream();
            const uniqueId = uuidv4();
            imageKey = `images/selling/category-images/${uniqueId}/hellofi-${uniqueId}.webp`;
            await uploadImageWithoutResize(stream, mimetype, imageKey);
            console.log('Image uploaded successfully:', imageKey);
          } catch (error) {
            console.error('Image upload failed:', error);
            // Continue without image if upload fails
          }
        }

        console.log('Attempting to create category in database...');
        const category = await db.category.create({
          data: {
            name,
            seoName,
            categoryType,
            image: imageKey,
            priority: priority ?? 0
          }
        });
        console.log('Category created successfully:', category);

        return {
          success: true,
          message: 'Category created successfully',
          category
        };
      } catch (error) {
        console.error('Detailed error creating category:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          input: input
        });
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to create category',
          {
            extensions: { 
              code: 'INTERNAL_SERVER_ERROR',
              originalError: error instanceof Error ? error.message : String(error)
            }
          }
        );
      }
    },

    updateCategory: async (_: unknown, { id, input }: { id: string; input: UpdateCategoryInput }): Promise<CategoryResponse> => {
      try {
        const { name, seoName, categoryType, priority } = input;
        console.log('Updating category with input:', { id, name, seoName, categoryType, priority });

        // Check if category exists
        console.log('Checking if category exists with id:', id);
        const existingCategory = await db.category.findUnique({
          where: { id }
        });

        if (!existingCategory) {
          console.log('Category not found with id:', id);
          throw new GraphQLError('Category not found', {
            extensions: { code: 'NOT_FOUND' }
          });
        }
        console.log('Found existing category:', existingCategory);

        // If seoName is being updated, check if it's unique
        if (seoName && seoName !== existingCategory.seoName) {
          console.log('Checking if new seoName is unique:', seoName);
          const duplicateCategory = await db.category.findUnique({
            where: { seoName }
          });

          if (duplicateCategory) {
            console.log('Found duplicate category with seoName:', seoName);
            throw new GraphQLError('Category with this SEO name already exists', {
              extensions: { code: 'BAD_USER_INPUT' }
            });
          }
        }

        console.log('Attempting to update category with data:', {
          where: { id },
          data: {
            name,
            seoName,
            categoryType,
            priority
          }
        });

        const category = await db.category.update({
          where: { id },
          data: {
            name,
            seoName,
            categoryType,
            priority
          }
        });

        console.log('Category updated successfully:', category);

        return {
          success: true,
          message: 'Category updated successfully',
          category
        };
      } catch (error) {
        console.error('Detailed error updating category:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          input: { id, ...input }
        });
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to update category',
          {
            extensions: { 
              code: 'INTERNAL_SERVER_ERROR',
              originalError: error instanceof Error ? error.message : String(error)
            }
          }
        );
      }
    },

    updateCategoryImage: async (_: unknown, { id, image }: { id: string; image: any }): Promise<CategoryResponse> => {
      try {
        const category = await db.category.findUnique({
          where: { id }
        });

        if (!category) {
          throw new GraphQLError('Category not found', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        const { createReadStream, filename, mimetype } = await image;
        const stream = createReadStream();
        const uniqueId = uuidv4();
        const imageKey = `images/selling/category-images/${id}/hellofi-${uniqueId}.webp`;
        
        await uploadImageWithoutResize(stream, mimetype, imageKey);

        const updatedCategory = await db.category.update({
          where: { id },
          data: { image: imageKey }
        });

        return {
          success: true,
          message: 'Category image updated successfully',
          category: updatedCategory
        };
      } catch (error) {
        console.error('Error updating category image:', error);
        throw new GraphQLError('Failed to update category image', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },

    deleteCategoryImage: async (_: unknown, { id }: { id: string }): Promise<CategoryResponse> => {
      try {
        const category = await db.category.findUnique({
          where: { id }
        });

        if (!category) {
          throw new GraphQLError('Category not found', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        const updatedCategory = await db.category.update({
          where: { id },
          data: { image: null }
        });

        return {
          success: true,
          message: 'Category image deleted successfully',
          category: updatedCategory
        };
      } catch (error) {
        console.error('Error deleting category image:', error);
        throw new GraphQLError('Failed to delete category image', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    },

    deleteCategory: async (_: unknown, { id }: { id: string }): Promise<CategoryResponse> => {
      try {
        const category = await db.category.findUnique({
          where: { id }
        });

        if (!category) {
          throw new GraphQLError('Category not found', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        await db.category.delete({
          where: { id }
        });

        return {
          success: true,
          message: 'Category deleted successfully'
        };
      } catch (error) {
        console.error('Error deleting category:', error);
        throw new GraphQLError('Failed to delete category', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        });
      }
    }
  }
}; 