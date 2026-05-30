type Result<T> = { success: true; data: T } | { success: false; error: Error };

export async function tryCatch<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
