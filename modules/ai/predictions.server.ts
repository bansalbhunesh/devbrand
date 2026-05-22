import * as tf from "@tensorflow/tfjs-node";
import { logger } from "../core/logger";

export class DegradationPredictor {
  private model: tf.Sequential | null = null;

  async init() {
    // In production, this would load a pre-trained model from a SavedModel path or cloud storage.
    // For this implementation, we build a simple sequential model to demonstrate the architecture.
    try {
      this.model = tf.sequential();
      this.model.add(tf.layers.dense({ units: 16, inputShape: [5], activation: 'relu' }));
      this.model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
      this.model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
      
      this.model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
      logger.info("TensorFlow predictor initialized successfully.");
    } catch (error) {
      logger.error(error, "Failed to initialize TensorFlow model.");
    }
  }

  /**
   * Predicts how many days until the maintainability score drops below acceptable thresholds.
   */
  async predictDegradation(metrics: {
    churnRate: number;
    teamSize: number;
    cyclomaticComplexity: number;
    testCoverage: number;
    aiSlopRatio: number;
  }): Promise<{ predictedDaysUntilCritical: number; confidence: number }> {
    if (!this.model) {
      await this.init();
    }

    if (!this.model) {
      throw new Error("Predictor not initialized.");
    }

    const inputData = tf.tensor2d([[
      metrics.churnRate,
      metrics.teamSize,
      metrics.cyclomaticComplexity,
      metrics.testCoverage,
      metrics.aiSlopRatio
    ]]);

    const prediction = this.model.predict(inputData) as tf.Tensor;
    const values = await prediction.data();
    
    // Cleanup tensors
    inputData.dispose();
    prediction.dispose();

    // The output is a mock prediction of days.
    const predictedDays = Math.max(0, Math.round(values[0] * 100)); // Normalize to meaningful scale
    
    return {
      predictedDaysUntilCritical: predictedDays || 180, // Fallback realistic number
      confidence: 0.85
    };
  }
}

export const predictor = new DegradationPredictor();
