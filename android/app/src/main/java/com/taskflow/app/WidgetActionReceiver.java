package com.taskflow.app;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class WidgetActionReceiver extends BroadcastReceiver {

    private static final String TAG = "WidgetActionReceiver";
    public static final String ACTION_COMPLETE = "com.taskflow.app.ACTION_COMPLETE";
    public static final String EXTRA_TASK_ID = "task_id";

    private static final String SUPABASE_URL = "https://njfhqsjoybbcvxtcltco.supabase.co";
    private static final String ANON_KEY = "sb_publishable_iGJ3dhO8hzko2XgeWU_vaA_vBptYgV2";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(final Context context, final Intent intent) {
        if (intent == null) return;
        
        String action = intent.getAction();
        if (ACTION_COMPLETE.equals(action)) {
            final String taskId = intent.getStringExtra(EXTRA_TASK_ID);
            final int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            
            if (taskId != null) {
                Log.d(TAG, "Received ACTION_COMPLETE for task: " + taskId);
                
                // Execute database update in background
                executor.execute(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            String patchUrl = SUPABASE_URL + "/rest/v1/tasks?id=eq." + taskId;
                            URL url = new URL(patchUrl);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            
                            // Send PATCH request
                            conn.setRequestMethod("POST"); // Use POST with HTTP override for PATCH if PATCH is blocked, or use standard PATCH
                            // Standard HttpURLConnection supports PATCH in Android, but let's send PATCH
                            conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
                            conn.setRequestMethod("POST"); 
                            
                            conn.setRequestProperty("apikey", ANON_KEY);
                            conn.setRequestProperty("Authorization", "Bearer " + ANON_KEY);
                            conn.setRequestProperty("Content-Type", "application/json");
                            conn.setRequestProperty("Prefer", "return=minimal");
                            conn.setDoOutput(true);
                            conn.setConnectTimeout(8000);
                            conn.setReadTimeout(8000);

                            String jsonBody = "{\"status\":\"done\"}";
                            OutputStream os = conn.getOutputStream();
                            byte[] input = jsonBody.getBytes("utf-8");
                            os.write(input, 0, input.length);
                            os.flush();
                            os.close();

                            int responseCode = conn.getResponseCode();
                            Log.d(TAG, "Supabase update response code: " + responseCode);
                            
                            // Log activity as well if possible (optional, non-blocking)
                            logActivity(taskId);

                            // Trigger widget refresh
                            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                                refreshWidget(context, appWidgetId);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to complete task in background", e);
                        }
                    }
                });
            }
        }
    }

    private void logActivity(String taskId) {
        try {
            String activityUrl = SUPABASE_URL + "/rest/v1/activity_log";
            URL url = new URL(activityUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("apikey", ANON_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + ANON_KEY);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            
            String jsonBody = "{\"task_id\":\"" + taskId + "\",\"action_text\":\"Marked Done from Widget.\"}";
            OutputStream os = conn.getOutputStream();
            byte[] input = jsonBody.getBytes("utf-8");
            os.write(input, 0, input.length);
            os.flush();
            os.close();
            
            conn.getResponseCode(); // Execute request
        } catch (Exception e) {
            Log.e(TAG, "Failed to log activity", e);
        }
    }

    private void refreshWidget(Context context, int appWidgetId) {
        Intent updateIntent = new Intent(context, TaskWidgetProvider.class);
        updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, new int[]{appWidgetId});
        context.sendBroadcast(updateIntent);
    }
}
