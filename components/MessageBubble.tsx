import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isMe = message.isCurrentUser;

  return (
    <View style={[styles.row, isMe ? styles.rowRight : styles.rowLeft]}>
      {!isMe && (
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(message.userName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {!isMe && (
          <Text style={styles.senderName}>{message.userName}</Text>
        )}
        <Text style={styles.messageText}>{message.text}</Text>
        <Text style={[styles.timestamp, isMe && styles.timestampMe]}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '70%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  senderName: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 21,
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
