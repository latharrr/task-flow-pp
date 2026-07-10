package com.taskflow.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TaskWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "TaskWidget";
    private static final String SUPABASE_URL = "https://njfhqsjoybbcvxtcltco.supabase.co";
    private static final String ANON_KEY = "sb_publishable_iGJ3dhO8hzko2XgeWU_vaA_vBptYgV2";
    
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // Perform updates for each active widget instance
        for (int appWidgetId : appWidgetIds) {
            updateWidgetData(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidgetData(final Context context, final AppWidgetManager appWidgetManager, final int appWidgetId) {
        // Set loading state first
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        views.setViewVisibility(R.id.empty_view, View.VISIBLE);
        views.setTextViewText(R.id.empty_view, "Loading tasks...");
        views.removeAllViews(R.id.tasks_container);
        
        // Setup static intents (+ button and refresh button)
        setupStaticIntents(context, views, appWidgetId);
        appWidgetManager.updateAppWidget(appWidgetId, views);

        // Fetch tasks on background thread
        executor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                    String todayStr = sdf.format(new Date());

                    // Query active (not done) tasks for today
                    String queryUrl = SUPABASE_URL + "/rest/v1/tasks?date=eq." + todayStr + "&status=neq.done&select=id,name,status,priority";
                    URL url = new URL(queryUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("apikey", ANON_KEY);
                    conn.setRequestProperty("Authorization", "Bearer " + ANON_KEY);
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(10000);

                    int responseCode = conn.getResponseCode();
                    if (responseCode == 200) {
                        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder response = new StringBuilder();
                        String inputLine;
                        while ((inputLine = in.readLine()) != null) {
                            response.append(inputLine);
                        }
                        in.close();

                        final JSONArray tasksArray = new JSONArray(response.toString());
                        mainHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                populateWidgetTasks(context, appWidgetManager, appWidgetId, tasksArray);
                            }
                        });
                    } else {
                        Log.e(TAG, "Server returned response code: " + responseCode);
                        showErrorMsg(context, appWidgetManager, appWidgetId, "Error loading tasks");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Exception fetching tasks", e);
                    showErrorMsg(context, appWidgetManager, appWidgetId, "Connection error");
                }
            }
        });
    }

    private void populateWidgetTasks(Context context, AppWidgetManager appWidgetManager, int appWidgetId, JSONArray tasks) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        views.removeAllViews(R.id.tasks_container);
        setupStaticIntents(context, views, appWidgetId);

        int count = tasks.length();
        if (count == 0) {
            views.setViewVisibility(R.id.empty_view, View.VISIBLE);
            views.setTextViewText(R.id.empty_view, "All caught up! 🎉");
        } else {
            views.setViewVisibility(R.id.empty_view, View.GONE);
            
            // Limit to max 4 tasks to avoid widget overflow
            int displayCount = Math.min(count, 4);
            for (int i = 0; i < displayCount; i++) {
                try {
                    JSONObject task = tasks.getJSONObject(i);
                    String taskId = task.getString("id");
                    String taskName = task.getString("name");
                    String priority = task.optString("priority", "medium");

                    RemoteViews itemViews = new RemoteViews(context.getPackageName(), R.layout.widget_task_item);
                    itemViews.setTextViewText(R.id.task_name, taskName);

                    // Color priority dot
                    int dotColor = Color.parseColor("#3B82F6"); // Default blue (low/todo)
                    if ("high".equalsIgnoreCase(priority)) {
                        dotColor = Color.parseColor("#EF4444"); // Red
                    } else if ("medium".equalsIgnoreCase(priority)) {
                        dotColor = Color.parseColor("#F59E0B"); // Orange
                    }
                    itemViews.setInt(R.id.priority_dot, "setBackgroundColor", dotColor);

                    // Set click pending intent for completing task
                    Intent completeIntent = new Intent(context, WidgetActionReceiver.class);
                    completeIntent.setAction(WidgetActionReceiver.ACTION_COMPLETE);
                    completeIntent.putExtra(WidgetActionReceiver.EXTRA_TASK_ID, taskId);
                    completeIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
                    
                    // Unique requestCode per item to prevent intent bundling
                    int requestCode = taskId.hashCode();
                    
                    PendingIntent completePI = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        completeIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    itemViews.setOnClickPendingIntent(R.id.btn_complete, completePI);

                    // Add to linear layout
                    views.addView(R.id.tasks_container, itemViews);
                } catch (Exception e) {
                    Log.e(TAG, "Error building task item view", e);
                }
            }
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private void showErrorMsg(Context context, AppWidgetManager appWidgetManager, int appWidgetId, String msg) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        views.setViewVisibility(R.id.empty_view, View.VISIBLE);
        views.setTextViewText(R.id.empty_view, msg);
        views.removeAllViews(R.id.tasks_container);
        setupStaticIntents(context, views, appWidgetId);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private void setupStaticIntents(Context context, RemoteViews views, int appWidgetId) {
        // 1. Add Task button intent (opens App with action=quickadd parameter)
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setAction(Intent.ACTION_VIEW);
        launchIntent.setData(Uri.parse("http://10.0.2.2:3000/tasks?action=quickadd"));
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent launchPI = PendingIntent.getActivity(
            context,
            appWidgetId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_add_task, launchPI);

        // 2. Refresh button intent
        Intent refreshIntent = new Intent(context, TaskWidgetProvider.class);
        refreshIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        refreshIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, new int[]{appWidgetId});
        
        PendingIntent refreshPI = PendingIntent.getBroadcast(
            context,
            appWidgetId + 1000, // Offset to differentiate
            refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPI);
    }
}
